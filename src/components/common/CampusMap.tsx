import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { KBTU_HALL_301_COORDS, formatDistance, calculateHaversineDistance } from '../../utils/geo';

interface CampusMapProps {
  studentLat: number;
  studentLng: number;
  status: 'INSIDE' | 'OUTSIDE' | 'DRIFT';
  className?: string;
}

export const CampusMap: React.FC<CampusMapProps> = ({
  studentLat,
  studentLng,
  status,
  className = 'h-72',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const studentMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center on KBTU Main Campus
    const center: [number, number] = [KBTU_HALL_301_COORDS.lat, KBTU_HALL_301_COORDS.lng];

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: 16,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    mapInstanceRef.current = map;

    // Clean OpenStreetMap tiles (CartoDB Positron / OSM style)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    // 150m Campus Geofence Circle
    const geofenceCircle = L.circle(center, {
      color: '#0B3D91',
      fillColor: '#0B3D91',
      fillOpacity: 0.12,
      weight: 2,
      dashArray: '5, 5',
      radius: KBTU_HALL_301_COORDS.allowedRadiusM,
    }).addTo(map);

    geofenceCircle.bindTooltip('150m Campus Geofence Boundary', {
      permanent: false,
      direction: 'top',
    });

    // Classroom Centroid Marker (Hall 301)
    const centroidIcon = L.divIcon({
      className: 'custom-centroid-marker',
      html: `
        <div style="background-color: #0B3D91; color: white; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; box-shadow: 0 4px 6px rgba(11,61,145,0.3); border: 2px solid white;">
          🏛️
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    L.marker(center, { icon: centroidIcon })
      .addTo(map)
      .bindPopup(
        `<div style="font-family: Inter, sans-serif; font-size: 12px;">
          <strong style="color: #0B3D91;">KBTU Hall 301 Centroid</strong><br/>
          Tole Bi 59, Almaty<br/>
          Allowed radius: <strong>150 meters</strong>
        </div>`
      );

    // Initial student marker
    const getStudentIcon = (st: 'INSIDE' | 'OUTSIDE' | 'DRIFT') => {
      const color = st === 'INSIDE' ? '#10B981' : st === 'OUTSIDE' ? '#EF4444' : '#F59E0B';
      const label = st === 'INSIDE' ? '✓' : st === 'OUTSIDE' ? '✕' : '⚠';
      return L.divIcon({
        className: 'custom-student-marker',
        html: `
          <div style="background-color: ${color}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.25); border: 2px solid white;">
            ${label}
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
    };

    const studentMarker = L.marker([studentLat, studentLng], {
      icon: getStudentIcon(status),
    }).addTo(map);

    studentMarkerRef.current = studentMarker;

    // Line connecting student and centroid
    const polyline = L.polyline(
      [center, [studentLat, studentLng]],
      { color: status === 'INSIDE' ? '#10B981' : '#EF4444', weight: 2, dashArray: '4, 4' }
    ).addTo(map);

    polylineRef.current = polyline;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update student position dynamically
  useEffect(() => {
    if (!mapInstanceRef.current || !studentMarkerRef.current) return;

    const studentPos: [number, number] = [studentLat, studentLng];
    studentMarkerRef.current.setLatLng(studentPos);

    const color = status === 'INSIDE' ? '#10B981' : status === 'OUTSIDE' ? '#EF4444' : '#F59E0B';
    const label = status === 'INSIDE' ? '✓' : status === 'OUTSIDE' ? '✕' : '⚠';

    studentMarkerRef.current.setIcon(
      L.divIcon({
        className: 'custom-student-marker',
        html: `
          <div style="background-color: ${color}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.25); border: 2px solid white;">
            ${label}
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
    );

    const dist = calculateHaversineDistance(
      studentLat,
      studentLng,
      KBTU_HALL_301_COORDS.lat,
      KBTU_HALL_301_COORDS.lng
    );

    studentMarkerRef.current.bindTooltip(
      `Student Position: ${formatDistance(dist)} (${dist <= 150 ? 'Allowed' : 'Exceeded'})`,
      { permanent: false, direction: 'top' }
    );

    if (polylineRef.current) {
      polylineRef.current.setLatLngs([
        [KBTU_HALL_301_COORDS.lat, KBTU_HALL_301_COORDS.lng],
        studentPos,
      ]);
      polylineRef.current.setStyle({
        color: status === 'INSIDE' ? '#10B981' : '#EF4444',
      });
    }

    // Adjust bounds if outside
    if (status === 'OUTSIDE') {
      mapInstanceRef.current.fitBounds([
        [KBTU_HALL_301_COORDS.lat, KBTU_HALL_301_COORDS.lng],
        studentPos,
      ], { padding: [40, 40] });
    } else {
      mapInstanceRef.current.setView([KBTU_HALL_301_COORDS.lat, KBTU_HALL_301_COORDS.lng], 16);
    }
  }, [studentLat, studentLng, status]);

  return (
    <div className={`w-full rounded-xl overflow-hidden border border-[#D6E2F5] shadow-xs relative z-0 ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
