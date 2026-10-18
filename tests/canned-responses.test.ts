import assert from "node:assert/strict";
import test from "node:test";

function normalizeCannedShortcut(raw: string): string {
  return raw.trim().toLowerCase().replace(/^\/+/, "");
}

test("normalizeCannedShortcut cleans leading slashes and normalizes case", () => {
  assert.equal(normalizeCannedShortcut("/Welcome"), "welcome");
  assert.equal(normalizeCannedShortcut("///PASSWORD-RESET"), "password-reset");
  assert.equal(normalizeCannedShortcut("  billing_inquiry  "), "billing_inquiry");
  assert.equal(normalizeCannedShortcut("thanks"), "thanks");
});

test("normalizeCannedShortcut rejects empty strings", () => {
  assert.equal(normalizeCannedShortcut(""), "");
  assert.equal(normalizeCannedShortcut("///"), "");
});
