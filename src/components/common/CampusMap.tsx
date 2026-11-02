import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { KBTU_HALL_301_COORDS, formatDistance, calculateHaversineDistance } from '../../utils/geo';
import { Layers, MapPin, Maximize2, Compass } from 'lucide-react';

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
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const studentMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const [mapLayer, setMapLayer] = useState<'OSM' | 'HOT'>('OSM');

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center on KBTU Main Campus, Tole Bi 59, Almaty
    const center: [number, number] = [KBTU_HALL_301_COORDS.lat, KBTU_HALL_301_COORDS.lng];

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: 16,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    mapInstanceRef.current = map;

    // Standard OpenStreetMap tiles (most reliable, works globally including Kazakhstan)
    const tileUrl =
      mapLayer === 'OSM'
        ? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors | KBTU Campus GIS',
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);

    // 150m Campus Geofence Circle
    const geofenceCircle = L.circle(center, {
      color: '#0B3D91',
      fillColor: '#0B3D91',
      fillOpacity: 0.15,
      weight: 3,
      dashArray: '6, 6',
      radius: KBTU_HALL_301_COORDS.allowedRadiusM,
    }).addTo(map);

    geofenceCircle.bindTooltip('150m Campus Geofence Boundary (Hall 301)', {
      permanent: false,
      direction: 'top',
    });

    // Classroom Centroid Marker (Hall 301)
    const centroidIcon = L.divIcon({
      className: 'custom-centroid-marker',
      html: `
        <div style="background-color: #0B3D91; color: white; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; box-shadow: 0 4px 10px rgba(11,61,145,0.4); border: 2.5px solid white;">
          🏛️
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    L.marker(center, { icon: centroidIcon })
      .addTo(map)
      .bindPopup(
        `<div style="font-family: Inter, sans-serif; font-size: 12px; line-height: 1.4;">
          <strong style="color: #0B3D91; font-size: 13px;">KBTU Main Building (Hall 301)</strong><br/>
          Tole Bi 59 / Astana Square, Almaty<br/>
          Allowed Radius: <strong>150 meters</strong><br/>
          Coordinates: 43.255320° N, 76.943094° E
        </div>`
      );

    // Student Marker Icon generator
    const getStudentIcon = (st: 'INSIDE' | 'OUTSIDE' | 'DRIFT') => {
      const color = st === 'INSIDE' ? '#10B981' : st === 'OUTSIDE' ? '#EF4444' : '#F59E0B';
      const label = st === 'INSIDE' ? '✓' : st === 'OUTSIDE' ? '✕' : '⚠';
      return L.divIcon({
        className: 'custom-student-marker',
        html: `
          <div style="background-color: ${color}; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; box-shadow: 0 4px 8px rgba(0,0,0,0.3); border: 2.5px solid white; animation: ${st === 'DRIFT' ? 'pulse 1.5s infinite' : 'none'};">
            ${label}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
    };

    const studentMarker = L.marker([studentLat, studentLng], {
      icon: getStudentIcon(status),
    }).addTo(map);

    studentMarkerRef.current = studentMarker;

    // Polyline connecting student and Hall 301 centroid
    const polyline = L.polyline(
      [center, [studentLat, studentLng]],
      {
        color: status === 'INSIDE' ? '#10B981' : '#EF4444',
        weight: 3,
        dashArray: '5, 5',
      }
    ).addTo(map);

    polylineRef.current = polyline;

    // CRITICAL: Call invalidateSize to guarantee tiles render properly even if DOM was animating!
    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapLayer]);

  // Update student position dynamically when simulation mode changes
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
          <div style="background-color: ${color}; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; box-shadow: 0 4px 8px rgba(0,0,0,0.3); border: 2.5px solid white;">
            ${label}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })
    );

    const dist = calculateHaversineDistance(
      studentLat,
      studentLng,
      KBTU_HALL_301_COORDS.lat,
      KBTU_HALL_301_COORDS.lng
    );

    studentMarkerRef.current.bindTooltip(
      `Student Position: ${formatDistance(dist)} (${dist <= 150 ? 'Within allowed campus radius' : 'Outside campus radius'})`,
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

    // Auto fit view to include both points
    if (status === 'OUTSIDE') {
      mapInstanceRef.current.fitBounds(
        [
          [KBTU_HALL_301_COORDS.lat, KBTU_HALL_301_COORDS.lng],
          studentPos,
        ],
        { padding: [50, 50], maxZoom: 16 }
      );
    } else {
      mapInstanceRef.current.setView([KBTU_HALL_301_COORDS.lat, KBTU_HALL_301_COORDS.lng], 16);
    }

    mapInstanceRef.current.invalidateSize();
  }, [studentLat, studentLng, status]);

  return (
    <div className={`relative w-full rounded-xl overflow-hidden border border-[#D6E2F5] shadow-xs bg-[#E8F0FE]/30 ${className}`}>
      {/* Top Map Toolbar: Almaty City & KBTU Location Badge */}
      <div className="absolute top-2.5 right-2.5 z-[1000] flex items-center gap-1.5 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-[#D6E2F5] shadow-md text-[11px] font-semibold text-[#0F1F3D]">
        <span className="flex items-center gap-1 text-[#0B3D91]">
          <MapPin className="w-3.5 h-3.5" />
          <span>Almaty • Tole Bi 59</span>
        </span>
        <span className="text-slate-300">|</span>
        <button
          type="button"
          onClick={() => setMapLayer(mapLayer === 'OSM' ? 'HOT' : 'OSM')}
          className="text-[#0B3D91] hover:underline flex items-center gap-1"
          title="Toggle Tile Provider"
        >
          <Layers className="w-3 h-3" />
          <span>{mapLayer === 'OSM' ? 'Standard' : 'Humanitarian'}</span>
        </button>
      </div>

      {/* Actual Leaflet Map Canvas with Guaranteed Fixed Height */}
      <div
        ref={mapContainerRef}
        className="w-full"
        style={{ height: '340px', minHeight: '340px', width: '100%' }}
      />
    </div>
  );
};
