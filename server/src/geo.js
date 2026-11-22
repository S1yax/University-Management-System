// Distance between two GPS points in meters (Haversine formula).
// The same formula as calculateHaversineDistance() in src/utils/geo.ts on the website.
export function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GPS accuracy (meters) worse than this is a weak signal (the same value as on the website)
export const WEAK_ACCURACY_THRESHOLD_M = 100;
// Accuracy below this is "too perfect": real GPS does not report it, fake-GPS apps often send 0
export const SUSPICIOUS_ACCURACY_BELOW_M = 1;

// Judges the accuracy that the device reported (accuracyM) for a student distanceM from the room:
//   'UNKNOWN'    no accuracy was sent
//   'SUSPICIOUS' too perfect (0 m, under 1 m, negative): possible fake GPS
//   'WEAK_NEAR'  weak signal and the accuracy circle still reaches the campus radius
//   'OK'         normal (including a weak signal so far away that the student cannot be inside)
export function judgeAccuracy(accuracyM, distanceM, radiusM) {
  if (typeof accuracyM !== 'number' || !Number.isFinite(accuracyM)) return 'UNKNOWN';
  if (accuracyM < SUSPICIOUS_ACCURACY_BELOW_M) return 'SUSPICIOUS';
  if (accuracyM > WEAK_ACCURACY_THRESHOLD_M && distanceM - accuracyM <= radiusM) return 'WEAK_NEAR';
  return 'OK';
}
