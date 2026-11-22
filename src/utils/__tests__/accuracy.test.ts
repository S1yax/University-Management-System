import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistance,
  isWeakAccuracy,
  isSuspiciousAccuracy,
  needsManualReview,
  shouldReviewWeakGps,
  KBTU_HALL_301_COORDS,
  SIMULATION_PRESETS,
  WEAK_ACCURACY_THRESHOLD_M,
  SUSPICIOUS_ACCURACY_BELOW_M,
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
  describe('isSuspiciousAccuracy (too perfect, possible fake GPS)', () => {
    it('treats 0 m and values under 1 m as suspicious', () => {
      expect(isSuspiciousAccuracy(0)).toBe(true);
      expect(isSuspiciousAccuracy(0.4)).toBe(true);
      expect(isSuspiciousAccuracy(-5)).toBe(true);
    });

    it('treats exactly 1 m and normal values as not suspicious', () => {
      expect(isSuspiciousAccuracy(SUSPICIOUS_ACCURACY_BELOW_M)).toBe(false);
      expect(isSuspiciousAccuracy(6)).toBe(false);
      expect(isSuspiciousAccuracy(250)).toBe(false);
    });

    it('does not treat unknown or invalid accuracy as suspicious', () => {
      expect(isSuspiciousAccuracy(undefined)).toBe(false);
      expect(isSuspiciousAccuracy(NaN)).toBe(false);
    });
  });

  describe('needsManualReview', () => {
    it('reviews a too-perfect accuracy inside the radius', () => {
      expect(needsManualReview(5, 0)).toBe(true);
    });

    it('does not review a too-perfect accuracy outside the radius (normal rejection)', () => {
      expect(needsManualReview(900, 0)).toBe(false);
    });

    it('still reviews weak accuracy near the campus', () => {
      expect(needsManualReview(20, 250)).toBe(true);
    });

    it('does not review a normal accuracy', () => {
      expect(needsManualReview(5, 8)).toBe(false);
      expect(needsManualReview(5, undefined)).toBe(false);
    });
  });
});
