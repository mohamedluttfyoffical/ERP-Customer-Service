/**
 * Real-time analytics and KPI calculation utilities for Sanad ERP.
 */

export function calculateResolutionRate(
  resolvedTickets: number,
  totalTickets: number
): number {
  if (totalTickets <= 0) return 100;
  return Math.round((resolvedTickets / totalTickets) * 100);
}

export function calculateSlaComplianceRate(
  slaMetCount: number,
  slaEligibleCount: number
): number {
  if (slaEligibleCount <= 0) return 100;
  return Math.round((slaMetCount / slaEligibleCount) * 100);
}

export function calculateAverageFirstResponseMinutes(
  totalMinutes: number,
  sampleCount: number
): number {
  if (sampleCount <= 0) return 0;
  return Math.round(totalMinutes / sampleCount);
}

export function calculateAverageResolutionHours(
  totalHours: number,
  sampleCount: number
): number {
  if (sampleCount <= 0) return 0;
  return Math.round((totalHours / sampleCount) * 10) / 10;
}

export function calculateCsatScore(
  ratings: number[],
  fallbackScore = 4.8
): number {
  if (!ratings.length) return fallbackScore;
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}
