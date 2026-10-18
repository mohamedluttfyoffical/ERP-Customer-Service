import assert from "node:assert/strict";
import test from "node:test";

import {
  RESERVED_TENANT_SLUGS,
  fieldErrorsFromZod,
  loginSchema,
  registrationSchema,
  safeRedirectPath,
} from "../src/lib/auth/validation";
import { consumeRateLimit, resetRateLimitState } from "../src/lib/auth/rate-limit";
import { passwordByteLength } from "../src/lib/auth/password";

const validRegistration = {
  companyName: "Al Noor Technology",
  slug: "al-noor",
  fullName: "Sara Alotaibi",
  email: "Sara@Example.com",
  password: "StrongPass123",
  confirmPassword: "StrongPass123",
  acceptTerms: "on",
  plan: "PROFESSIONAL",
  interval: "ANNUAL",
  locale: "ar",
};

test("registration schema normalizes email and accepts a valid workspace", () => {
  const parsed = registrationSchema.safeParse(validRegistration);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.email, "sara@example.com");
    assert.equal(parsed.data.plan, "PROFESSIONAL");
  }
});

test("registration rejects weak, mismatched, or structurally invalid input", () => {
  const weak = registrationSchema.safeParse({
    ...validRegistration,
    password: "short",
    confirmPassword: "short",
  });
  assert.equal(weak.success, false);

  const mismatch = registrationSchema.safeParse({
    ...validRegistration,
    confirmPassword: "DifferentPass123",
  });
  assert.equal(mismatch.success, false);
  if (!mismatch.success) {
    assert.equal(fieldErrorsFromZod(mismatch.error).confirmPassword, "Validation.passwordMismatch");
  }

  const missingTerms = registrationSchema.safeParse({
    ...validRegistration,
    acceptTerms: "",
  });
  assert.equal(missingTerms.success, false);

  const reserved = registrationSchema.safeParse({
    ...validRegistration,
    slug: "platform",
  });
  assert.equal(reserved.success, false);
  assert.ok(RESERVED_TENANT_SLUGS.has("platform"));

  const badSlug = registrationSchema.safeParse({
    ...validRegistration,
    slug: "Upper_Case Slug",
  });
  assert.equal(badSlug.success, false);
});

test("bcrypt byte limit is enforced for non-ASCII passwords", () => {
  const password = `Aa1${"ب".repeat(35)}`;
  assert.ok(passwordByteLength(password) > 72);
  const parsed = registrationSchema.safeParse({
    ...validRegistration,
    password,
    confirmPassword: password,
  });
  assert.equal(parsed.success, false);
});

test("login normalizes email case before querying", () => {
  const parsed = loginSchema.safeParse({
    email: "  SaRa@Example.COM ",
    password: "StrongPass123",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.email, "sara@example.com");
  }
});

test("redirect sanitizer blocks open redirect and API destinations", () => {
  const fallback = "/ar/app";
  assert.equal(
    safeRedirectPath("/ar/app/demo?tab=team#members", fallback),
    "/ar/app/demo?tab=team#members",
  );
  assert.equal(safeRedirectPath("//evil.example", fallback), fallback);
  assert.equal(safeRedirectPath("https://evil.example", fallback), fallback);
  assert.equal(safeRedirectPath("/\\evil.example", fallback), fallback);
  assert.equal(safeRedirectPath("/api/auth/session", fallback), fallback);
  assert.equal(safeRedirectPath("", fallback), fallback);
});

test("fixed-window limiter blocks the next request and resets after the window", (t) => {
  resetRateLimitState();
  t.mock.timers.enable({ apis: ["Date"], now: 1_000_000 });

  const first = consumeRateLimit("test-key", { limit: 2, windowMs: 60_000 });
  const second = consumeRateLimit("test-key", { limit: 2, windowMs: 60_000 });
  const blocked = consumeRateLimit("test-key", { limit: 2, windowMs: 60_000 });
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);

  t.mock.timers.tick(60_001);
  const afterWindow = consumeRateLimit("test-key", { limit: 2, windowMs: 60_000 });
  assert.equal(afterWindow.allowed, true);
  resetRateLimitState();
});
