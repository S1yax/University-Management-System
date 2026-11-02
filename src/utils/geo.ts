/**
 * Geolocation & Haversine distance calculations
 * Centroid for KBTU Main Building (Hall 301, Tole Bi 59, Astana Square, Almaty):
 * 2GIS / Yandex Maps verified coordinates:
 * Latitude: 43.255320 (or 43.255603)
 * Longitude: 76.943094 (or 76.943210)
 * Campus allowed radius: 150 meters
 */

export const KBTU_HALL_301_COORDS = {
  lat: 43.255320,
  lng: 76.943094,
  secondaryLat: 43.255603,
  secondaryLng: 76.943210,
  name: 'Hall 301, Main Building, KBTU (Tole Bi 59, Astana Square)',
  allowedRadiusM: 150,
};

// Simulation presets for easy testing (grounded on Tole Bi 59, Almaty)
export const SIMULATION_PRESETS = {
  INSIDE: {
    name: 'Inside Hall 301 (Campus)',
    lat: 43.255345,
    lng: 76.943110,
    accuracy: 6, // high accuracy 6 meters
    description: 'Inside Hall 301 / Tole Bi 59, ~3.5 meters from centroid',
  },
  OUTSIDE: {
    name: 'Outside Campus (City / Dorm)',
    lat: 43.264200,
    lng: 76.953500,
    accuracy: 15,
    description: 'Over 1.2 km away from KBTU campus center',
  },
  DRIFT: {
    name: 'Indoor GPS Drift (Weak Signal)',
    lat: 43.258200,
    lng: 76.946800,
    accuracy: 380, // poor accuracy
    description: 'Multipath reflection inside thick stone walls of KBTU (~440m)',
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
 * Formats distance nicely (e.g. "4.2 m" or "1.25 km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters.toFixed(1)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}
