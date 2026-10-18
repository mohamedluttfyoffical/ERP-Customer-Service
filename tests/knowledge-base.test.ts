import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateHelpfulnessPercentage,
  slugify,
} from "../src/lib/kb/slug";

test("slugify generates clean URL-safe slugs from English titles", () => {
  assert.equal(
    slugify("How to Configure Email Notifications"),
    "how-to-configure-email-notifications"
  );
  assert.equal(
    slugify("  SLA Target Times & Escalation Rules!  "),
    "sla-target-times-escalation-rules"
  );
  assert.equal(
    slugify("Network_Diagnostics---v2.0"),
    "network-diagnostics-v20"
  );
});

test("slugify handles empty strings and special characters gracefully", () => {
  assert.equal(slugify(""), "");
  assert.equal(slugify("!!!???###"), "");
  assert.equal(slugify("---test---"), "test");
});

test("calculateHelpfulnessPercentage computes positive rating accurately", () => {
  // 8 helpful, 2 unhelpful -> 80%
  assert.equal(calculateHelpfulnessPercentage(8, 2), 80);

  // 10 helpful, 0 unhelpful -> 100%
  assert.equal(calculateHelpfulnessPercentage(10, 0), 100);

  // 0 helpful, 5 unhelpful -> 0%
  assert.equal(calculateHelpfulnessPercentage(0, 5), 0);

  // 1 helpful, 2 unhelpful -> 33%
  assert.equal(calculateHelpfulnessPercentage(1, 2), 33);
});

test("calculateHelpfulnessPercentage returns null when no feedback has been submitted", () => {
  assert.equal(calculateHelpfulnessPercentage(0, 0), null);
});
