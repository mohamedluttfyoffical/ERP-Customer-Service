import assert from "node:assert/strict";
import test from "node:test";

import {
  PLAN_CATALOG,
  PLAN_CODES,
  PLAN_FEATURES,
  USAGE_METRICS,
  calculateAnnualSavings,
  getPlanByCode,
} from "../src/lib/plans";

test("plan catalogue has unique, complete tiers", () => {
  assert.equal(PLAN_CATALOG.length, PLAN_CODES.length);
  assert.equal(new Set(PLAN_CATALOG.map((plan) => plan.code)).size, PLAN_CATALOG.length);
  assert.deepEqual(
    PLAN_CATALOG.map((plan) => plan.code),
    [...PLAN_CODES],
  );
  assert.ok(PLAN_CATALOG.every((plan) => plan.code === getPlanByCode(plan.code).code));
});

test("annual pricing equals ten monthly payments for every tier", () => {
  for (const plan of PLAN_CATALOG) {
    assert.equal(
      Number(plan.prices.ANNUAL),
      Number(plan.prices.MONTHLY) * 10,
      `${plan.code} annual price must equal ten monthly payments`,
    );
    assert.equal(plan.trialDays, 14);
  }
});

test("annual savings match the advertised twelve-month discount", () => {
  for (const plan of PLAN_CATALOG) {
    const savings = calculateAnnualSavings(plan.prices.MONTHLY, plan.prices.ANNUAL);
    assert.equal(savings.amount, (Number(plan.prices.MONTHLY) * 2).toFixed(2));
    assert.equal(savings.percent, plan.annualDiscountPercent);
  }
});

test("every plan defines all usage limits and unique feature keys", () => {
  for (const plan of PLAN_CATALOG) {
    assert.deepEqual(Object.keys(plan.limits).sort(), [...USAGE_METRICS].sort());
    for (const metric of USAGE_METRICS) {
      const limit = plan.limits[metric];
      assert.ok(limit === null || (Number.isInteger(limit) && limit > 0));
    }
    assert.equal(new Set(plan.features).size, plan.features.length);
    assert.ok(plan.features.every((feature) => feature in PLAN_FEATURES));
  }
});

test("higher tiers never reduce a numeric entitlement", () => {
  const sortedPlans = [...PLAN_CATALOG].sort((a, b) => a.tier - b.tier);
  for (const metric of USAGE_METRICS) {
    for (let index = 1; index < sortedPlans.length; index += 1) {
      const previous = sortedPlans[index - 1]?.limits[metric];
      const current = sortedPlans[index]?.limits[metric];
      if (previous === null || current === null) {
        continue;
      }
      assert.ok(
        Number(current) >= Number(previous),
        `${sortedPlans[index]?.code} must not lower ${metric}`,
      );
    }
  }
});
