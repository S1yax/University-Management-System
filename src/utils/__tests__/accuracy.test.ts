import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistance,
  isWeakAccuracy,
  shouldReviewWeakGps,
  KBTU_HALL_301_COORDS,
  SIMULATION_PRESETS,
  WEAK_ACCURACY_THRESHOLD_M,
} from '../geo';

describe('GPS accuracy check', () => {
  describe('isWeakAccuracy', () => {
    it('treats good accuracy as normal (INSIDE preset, 6 m)', () => {
      expect(isWeakAccuracy(SIMULATION_PRESETS.INSIDE.accuracy)).toBe(false);
    });

    it('treats the exact threshold as normal and one meter above as weak', () => {
      expect(isWeakAccuracy(WEAK_ACCURACY_THRESHOLD_M)).toBe(false);
      expect(isWeakAccuracy(WEAK_ACCURACY_THRESHOLD_M + 1)).toBe(true);
    });

    it('treats DRIFT preset accuracy (380 m) as weak', () => {
      expect(isWeakAccuracy(SIMULATION_PRESETS.DRIFT.accuracy)).toBe(true);
    });

    it('does not treat unknown or invalid accuracy as weak', () => {
      expect(isWeakAccuracy(undefined)).toBe(false);
      expect(isWeakAccuracy(NaN)).toBe(false);
    });

    it('accepts a custom threshold', () => {
      expect(isWeakAccuracy(40, 30)).toBe(true);
      expect(isWeakAccuracy(20, 30)).toBe(false);
    });
  });

  describe('shouldReviewWeakGps', () => {
    it('does not review a good-accuracy check-in, even outside the radius', () => {
      expect(shouldReviewWeakGps(900, 12)).toBe(false);
    });

    it('sends the DRIFT preset to manual review', () => {
      const distance = calculateHaversineDistance(
        SIMULATION_PRESETS.DRIFT.lat,
        SIMULATION_PRESETS.DRIFT.lng,
        KBTU_HALL_301_COORDS.lat,
        KBTU_HALL_301_COORDS.lng
      );
      expect(shouldReviewWeakGps(distance, SIMULATION_PRESETS.DRIFT.accuracy)).toBe(true);
    });

    it('sends weak accuracy inside the radius to manual review', () => {
      expect(shouldReviewWeakGps(20, 250)).toBe(true);
    });

    it('does not review a far student whose accuracy circle misses the campus', () => {
      // 20 km away with 500 m accuracy (e.g. IP-based location)
      expect(shouldReviewWeakGps(20000, 500)).toBe(false);
    });

    it('reviews at the boundary where the accuracy circle just touches the radius', () => {
      // distance - accuracy = 150 -> reaches the radius
      expect(shouldReviewWeakGps(350, 200)).toBe(true);
      expect(shouldReviewWeakGps(351, 200)).toBe(false);
    });

    it('does not review when accuracy is unknown', () => {
      expect(shouldReviewWeakGps(30, undefined)).toBe(false);
    });
  });
});
