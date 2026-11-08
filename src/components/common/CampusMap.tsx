import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { KBTU_HALL_301_COORDS, formatDistance, calculateHaversineDistance } from '../../utils/geo';
import { Layers, MapPin } from 'lucide-react';

interface CampusMapProps {
  studentLat: number;
  studentLng: number;
  status: 'INSIDE' | 'OUTSIDE' | 'DRIFT';
  accuracyM?: number;
  sourceLabel?: string;
  className?: string;
}

export const CampusMap: React.FC<CampusMapProps> = ({
  studentLat,
  studentLng,
  status,
  accuracyM,
  sourceLabel,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const studentMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const [mapLayer, setMapLayer] = useState<'OSM' | 'HOT'>('OSM');

  const center: [number, number] = [KBTU_HALL_301_COORDS.lat, KBTU_HALL_301_COORDS.lng];
  const dist = calculateHaversineDistance(studentLat, studentLng, center[0], center[1]);
  const isInside = dist <= KBTU_HALL_301_COORDS.allowedRadiusM;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: isInside ? 16 : 14,
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
    const getStudentIcon = (effectiveStatus: 'INSIDE' | 'OUTSIDE' | 'DRIFT') => {
      const color = effectiveStatus === 'INSIDE' ? '#10B981' : effectiveStatus === 'OUTSIDE' ? '#EF4444' : '#F59E0B';
      const label = effectiveStatus === 'INSIDE' ? '✓' : effectiveStatus === 'OUTSIDE' ? '✕' : '⚠';
      return L.divIcon({
        className: 'custom-student-marker',
        html: `
          <div style="background-color: ${color}; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2.5px solid white; animation: ${effectiveStatus === 'DRIFT' ? 'pulse 1.5s infinite' : 'none'};">
            ${label}
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
    };

    const effectiveStatus: 'INSIDE' | 'OUTSIDE' | 'DRIFT' =
      status === 'DRIFT' ? 'DRIFT' : isInside ? 'INSIDE' : 'OUTSIDE';

    const studentMarker = L.marker([studentLat, studentLng], {
      icon: getStudentIcon(effectiveStatus),
    }).addTo(map);

    studentMarkerRef.current = studentMarker;

    studentMarker.bindTooltip(
      `<b>${sourceLabel || 'Your Location'}</b><br/>Distance to KBTU: <b>${formatDistance(dist)}</b><br/>${
        isInside ? '🟢 Inside 150m Circle (Allowed)' : '🔴 Outside 150m Circle (Blocked)'
      }`,
      { permanent: false, direction: 'top' }
    );

    // Optional GPS accuracy circle
    if (accuracyM && accuracyM > 0) {
      const accCircle = L.circle([studentLat, studentLng], {
        radius: Math.min(accuracyM, 300),
        color: effectiveStatus === 'INSIDE' ? '#10B981' : '#EF4444',
        fillColor: effectiveStatus === 'INSIDE' ? '#10B981' : '#EF4444',
        fillOpacity: 0.1,
        weight: 1,
        dashArray: '3, 3',
      }).addTo(map);
      accuracyCircleRef.current = accCircle;
    }

    // Polyline connecting student and Hall 301 centroid
    const polyline = L.polyline([center, [studentLat, studentLng]], {
      color: effectiveStatus === 'INSIDE' ? '#10B981' : '#EF4444',
      weight: 3,
      dashArray: '5, 5',
    }).addTo(map);

    polylineRef.current = polyline;

    // Auto-fit bounds if outside so both student and KBTU are clearly visible
    if (!isInside) {
      map.fitBounds([center, [studentLat, studentLng]], {
        padding: [60, 60],
        maxZoom: 16,
      });
    }

    // Invalidate size on mount to guarantee tiles render properly
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

  // Update student position dynamically when coordinates or status changes
  useEffect(() => {
    if (!mapInstanceRef.current || !studentMarkerRef.current) return;

    const studentPos: [number, number] = [studentLat, studentLng];
    studentMarkerRef.current.setLatLng(studentPos);

    const currentDist = calculateHaversineDistance(studentLat, studentLng, center[0], center[1]);
    const currentIsInside = currentDist <= KBTU_HALL_301_COORDS.allowedRadiusM;
    const effectiveStatus: 'INSIDE' | 'OUTSIDE' | 'DRIFT' =
      status === 'DRIFT' ? 'DRIFT' : currentIsInside ? 'INSIDE' : 'OUTSIDE';

    const color = effectiveStatus === 'INSIDE' ? '#10B981' : effectiveStatus === 'OUTSIDE' ? '#EF4444' : '#F59E0B';
    const label = effectiveStatus === 'INSIDE' ? '✓' : effectiveStatus === 'OUTSIDE' ? '✕' : '⚠';

    studentMarkerRef.current.setIcon(
      L.divIcon({
        className: 'custom-student-marker',
        html: `
          <div style="background-color: ${color}; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2.5px solid white;">
            ${label}
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      })
    );

    studentMarkerRef.current.bindTooltip(
      `<b>${sourceLabel || 'Your Location'}</b><br/>Distance to KBTU: <b>${formatDistance(currentDist)}</b><br/>${
        currentIsInside ? '🟢 Inside 150m Circle (Allowed)' : '🔴 Outside 150m Circle (Blocked)'
      }`,
      { permanent: false, direction: 'top' }
    );

    // Update or create accuracy circle
    if (accuracyCircleRef.current) {
      if (accuracyM && accuracyM > 0) {
        accuracyCircleRef.current.setLatLng(studentPos);
        accuracyCircleRef.current.setRadius(Math.min(accuracyM, 300));
        accuracyCircleRef.current.setStyle({
          color: effectiveStatus === 'INSIDE' ? '#10B981' : '#EF4444',
          fillColor: effectiveStatus === 'INSIDE' ? '#10B981' : '#EF4444',
        });
      } else {
        accuracyCircleRef.current.remove();
        accuracyCircleRef.current = null;
      }
    } else if (accuracyM && accuracyM > 0) {
      const accCircle = L.circle(studentPos, {
        radius: Math.min(accuracyM, 300),
        color: effectiveStatus === 'INSIDE' ? '#10B981' : '#EF4444',
        fillColor: effectiveStatus === 'INSIDE' ? '#10B981' : '#EF4444',
        fillOpacity: 0.1,
        weight: 1,
        dashArray: '3, 3',
      }).addTo(mapInstanceRef.current);
      accuracyCircleRef.current = accCircle;
    }

    if (polylineRef.current) {
      polylineRef.current.setLatLngs([center, studentPos]);
      polylineRef.current.setStyle({
        color: effectiveStatus === 'INSIDE' ? '#10B981' : '#EF4444',
      });
    }

    // Auto fit view to include both points if outside
    if (!currentIsInside) {
      mapInstanceRef.current.fitBounds([center, studentPos], {
        padding: [60, 60],
        maxZoom: 16,
      });
    } else {
      mapInstanceRef.current.setView(center, 16);
    }

    mapInstanceRef.current.invalidateSize();
  }, [studentLat, studentLng, status, accuracyM, sourceLabel]);

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
        style={{ height: '360px', minHeight: '360px', width: '100%' }}
      />
    </div>
  );
};
