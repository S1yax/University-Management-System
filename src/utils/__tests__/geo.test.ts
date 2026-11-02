import { describe, it, expect } from 'vitest';
import { calculateHaversineDistance, formatDistance, KBTU_HALL_301_COORDS, SIMULATION_PRESETS } from '../geo';

describe('GPS Haversine Calculations', () => {
  it('computes distance to same coordinate as 0m', () => {
    const dist = calculateHaversineDistance(
      KBTU_HALL_301_COORDS.lat,
      KBTU_HALL_301_COORDS.lng,
      KBTU_HALL_301_COORDS.lat,
      KBTU_HALL_301_COORDS.lng
    );
    expect(dist).toBe(0);
  });

  it('computes INSIDE Hall 301 preset within allowed 150m radius', () => {
    const dist = calculateHaversineDistance(
      SIMULATION_PRESETS.INSIDE.lat,
      SIMULATION_PRESETS.INSIDE.lng,
      KBTU_HALL_301_COORDS.lat,
      KBTU_HALL_301_COORDS.lng
    );
    expect(dist).toBeLessThanOrEqual(150);
    expect(dist).toBeLessThan(10); // inside classroom seat ~4m
  });

  it('computes OUTSIDE campus preset well beyond 150m radius', () => {
    const dist = calculateHaversineDistance(
      SIMULATION_PRESETS.OUTSIDE.lat,
      SIMULATION_PRESETS.OUTSIDE.lng,
      KBTU_HALL_301_COORDS.lat,
      KBTU_HALL_301_COORDS.lng
    );
    expect(dist).toBeGreaterThan(150);
    expect(dist).toBeGreaterThan(500); // ~850m away
  });

  it('formats distance correctly in meters and kilometers', () => {
    expect(formatDistance(45.2)).toBe('45.2 m');
    expect(formatDistance(1250)).toBe('1.25 km');
  });
});
