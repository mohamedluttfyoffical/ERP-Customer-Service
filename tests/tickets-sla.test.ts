import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_SLA_TARGETS,
  getSlaRemainingInfo,
} from "../src/lib/tickets/sla";

test("DEFAULT_SLA_TARGETS defines strict hierarchy across all ticket priorities", () => {
  assert.equal(DEFAULT_SLA_TARGETS.URGENT.firstResponseMinutes, 60);
  assert.equal(DEFAULT_SLA_TARGETS.URGENT.resolutionMinutes, 240);

  assert.equal(DEFAULT_SLA_TARGETS.HIGH.firstResponseMinutes, 120);
  assert.equal(DEFAULT_SLA_TARGETS.HIGH.resolutionMinutes, 480);

  assert.equal(DEFAULT_SLA_TARGETS.MEDIUM.firstResponseMinutes, 240);
  assert.equal(DEFAULT_SLA_TARGETS.MEDIUM.resolutionMinutes, 1440);

  assert.equal(DEFAULT_SLA_TARGETS.LOW.firstResponseMinutes, 480);
  assert.equal(DEFAULT_SLA_TARGETS.LOW.resolutionMinutes, 2880);

  // Assert monotonicity: urgent is faster than high, high faster than medium, medium faster than low
  assert.ok(
    DEFAULT_SLA_TARGETS.URGENT.firstResponseMinutes <
      DEFAULT_SLA_TARGETS.HIGH.firstResponseMinutes
  );
  assert.ok(
    DEFAULT_SLA_TARGETS.HIGH.firstResponseMinutes <
      DEFAULT_SLA_TARGETS.MEDIUM.firstResponseMinutes
  );
  assert.ok(
    DEFAULT_SLA_TARGETS.MEDIUM.firstResponseMinutes <
      DEFAULT_SLA_TARGETS.LOW.firstResponseMinutes
  );
});

test("getSlaRemainingInfo returns null when dueDate is null", () => {
  const result = getSlaRemainingInfo(null);
  assert.equal(result, null);
});

test("getSlaRemainingInfo calculates unbreached countdown for future due dates", () => {
  const now = new Date("2026-10-18T12:00:00Z");
  // Due in 2 hours and 30 minutes
  const due = new Date("2026-10-18T14:30:00Z");

  const result = getSlaRemainingInfo(due, now);

  assert.ok(result);
  assert.equal(result.isBreached, false);
  assert.equal(result.breached, false);
  assert.equal(result.minutesRemaining, 150);
  assert.equal(result.label, "2h 30m");
  assert.equal(result.text, "2h 30m");
});

test("getSlaRemainingInfo calculates unbreached countdown under 1 hour", () => {
  const now = new Date("2026-10-18T12:00:00Z");
  // Due in 45 minutes
  const due = new Date("2026-10-18T12:45:00Z");

  const result = getSlaRemainingInfo(due, now);

  assert.ok(result);
  assert.equal(result.isBreached, false);
  assert.equal(result.minutesRemaining, 45);
  assert.equal(result.label, "45m");
});

test("getSlaRemainingInfo flags breach and formats positive overdue label for past due dates", () => {
  const now = new Date("2026-10-18T15:00:00Z");
  // Was due 1 hour and 15 minutes ago
  const due = new Date("2026-10-18T13:45:00Z");

  const result = getSlaRemainingInfo(due, now);

  assert.ok(result);
  assert.equal(result.isBreached, true);
  assert.equal(result.breached, true);
  assert.equal(result.minutesRemaining, -75);
  assert.equal(result.label, "+1h 15m");
  assert.equal(result.text, "+1h 15m");
});

test("getSlaRemainingInfo respects completedDate when ticket was resolved before deadline", () => {
  const due = new Date("2026-10-18T16:00:00Z");
  const responded = new Date("2026-10-18T14:00:00Z");

  // Even if tested against a future date, response happened before due
  const result = getSlaRemainingInfo(due, responded);

  assert.ok(result);
  assert.equal(result.isBreached, false);
  assert.equal(result.breached, false);
  assert.equal(result.minutesRemaining, 120);
});

test("getSlaRemainingInfo flags breach when completedDate is after deadline", () => {
  const due = new Date("2026-10-18T12:00:00Z");
  const responded = new Date("2026-10-18T13:30:00Z");

  const result = getSlaRemainingInfo(due, responded);

  assert.ok(result);
  assert.equal(result.isBreached, true);
  assert.equal(result.breached, true);
  assert.equal(result.minutesRemaining, -90);
  assert.equal(result.label, "+1h 30m");
});
