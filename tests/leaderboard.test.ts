import assert from "node:assert/strict";
import test from "node:test";

function calculateAgentScore(params: {
  resolvedCount: number;
  resolutionRate: number;
  csatAverage: number;
}): number {
  return (
    params.resolvedCount * 20 +
    Math.round(params.resolutionRate * 1.5) +
    Math.round(params.csatAverage * 15)
  );
}

test("calculateAgentScore awards appropriate weighting to resolution, rate, and CSAT", () => {
  // Agent A: 10 resolved, 90% resolution rate, 4.8 CSAT
  // 10 * 20 = 200
  // 90 * 1.5 = 135
  // 4.8 * 15 = 72
  // Total = 407
  assert.equal(
    calculateAgentScore({ resolvedCount: 10, resolutionRate: 90, csatAverage: 4.8 }),
    407
  );

  // Agent B: 2 resolved, 50% rate, 4.0 CSAT
  // 2 * 20 = 40
  // 50 * 1.5 = 75
  // 4.0 * 15 = 60
  // Total = 175
  assert.equal(
    calculateAgentScore({ resolvedCount: 2, resolutionRate: 50, csatAverage: 4.0 }),
    175
  );
});

test("Agent ranking orders higher scoring agents first", () => {
  const agents = [
    { name: "Agent B", points: 175 },
    { name: "Agent A", points: 407 },
    { name: "Agent C", points: 290 },
  ];

  const sorted = [...agents].sort((a, b) => b.points - a.points);

  assert.equal(sorted[0]?.name, "Agent A");
  assert.equal(sorted[1]?.name, "Agent C");
  assert.equal(sorted[2]?.name, "Agent B");
});
