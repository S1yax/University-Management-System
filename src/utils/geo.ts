/**
 * Geolocation & Haversine distance calculations
 * Centroid for KBTU Hall 301 (Tole Bi 59, Almaty):
 * Latitude: 43.238949, Longitude: 76.889709
 * Campus allowed radius: 150 meters
 */

export const KBTU_HALL_301_COORDS = {
  lat: 43.238949,
  lng: 76.889709,
  name: 'Hall 301, Main Building, KBTU (Tole Bi 59)',
  allowedRadiusM: 150,
};

// Simulation presets for easy testing
export const SIMULATION_PRESETS = {
  INSIDE: {
    name: 'Inside Hall 301 (Campus)',
    lat: 43.238978,
    lng: 76.889725,
    accuracy: 8, // high accuracy 8 meters
    description: 'Exact classroom seat, ~5 meters from centroid',
  },
  OUTSIDE: {
    name: 'Outside Campus (Dorm / City)',
    lat: 43.245210,
    lng: 76.896840,
    accuracy: 12,
    description: 'Over 850m away from KBTU campus center',
  },
  DRIFT: {
    name: 'Indoor GPS Drift (Weak Signal)',
    lat: 43.240800,
    lng: 76.893200,
    accuracy: 380, // poor accuracy
    description: 'Multipath reflection inside thick stone walls',
  },
};

/**
 * Calculates Great-Circle distance using Haversine formula in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's mean radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // rounded to 1 decimal place
}

/**
 * Formats distance nicely (e.g. "14.2 m" or "1.4 km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters.toFixed(1)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}
