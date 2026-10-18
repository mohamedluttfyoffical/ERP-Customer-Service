import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateAverageFirstResponseMinutes,
  calculateAverageResolutionHours,
  calculateCsatScore,
  calculateResolutionRate,
  calculateSlaComplianceRate,
} from "../src/lib/analytics/metrics";

test("calculateResolutionRate computes accurate percentage and handles zero total tickets", () => {
  // Empty queue should report 100% resolved / healthy
  assert.equal(calculateResolutionRate(0, 0), 100);

  // 15 resolved out of 20 total -> 75%
  assert.equal(calculateResolutionRate(15, 20), 75);

  // 1 resolved out of 3 total -> 33%
  assert.equal(calculateResolutionRate(1, 3), 33);

  // 10 resolved out of 10 total -> 100%
  assert.equal(calculateResolutionRate(10, 10), 100);
});

test("calculateSlaComplianceRate computes accurate compliance percentage", () => {
  // No SLA-tracked tickets yet -> default to 100% compliance
  assert.equal(calculateSlaComplianceRate(0, 0), 100);

  // 9 met out of 10 eligible -> 90%
  assert.equal(calculateSlaComplianceRate(9, 10), 90);

  // 4 met out of 5 eligible -> 80%
  assert.equal(calculateSlaComplianceRate(4, 5), 80);

  // 0 met out of 4 eligible -> 0%
  assert.equal(calculateSlaComplianceRate(0, 4), 0);
});

test("calculateAverageFirstResponseMinutes calculates rounded average or returns zero", () => {
  assert.equal(calculateAverageFirstResponseMinutes(0, 0), 0);

  // 150 minutes across 3 tickets -> 50 minutes avg
  assert.equal(calculateAverageFirstResponseMinutes(150, 3), 50);

  // 100 minutes across 3 tickets -> 33.33... rounded to 33 minutes
  assert.equal(calculateAverageFirstResponseMinutes(100, 3), 33);
});

test("calculateAverageResolutionHours calculates rounded average to 1 decimal place", () => {
  assert.equal(calculateAverageResolutionHours(0, 0), 0);

  // 15.5 hours across 2 tickets -> 7.8 hours avg
  assert.equal(calculateAverageResolutionHours(15.5, 2), 7.8);

  // 24 hours across 4 tickets -> 6.0 hours avg
  assert.equal(calculateAverageResolutionHours(24, 4), 6);
});

test("calculateCsatScore averages customer satisfaction ratings or uses fallback", () => {
  // No ratings yet should return standard benchmark
  assert.equal(calculateCsatScore([]), 4.8);

  // Array of 5-star ratings
  assert.equal(calculateCsatScore([5, 5, 5]), 5.0);

  // Mixed ratings: 5, 4, 3, 5 -> avg 4.25 rounded to 4.3
  assert.equal(calculateCsatScore([5, 4, 3, 5]), 4.3);

  // Custom fallback score
  assert.equal(calculateCsatScore([], 5.0), 5.0);
});
