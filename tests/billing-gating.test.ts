import assert from "node:assert/strict";
import test from "node:test";

import {
  PlanLimitExceededError,
  FeatureNotIncludedError,
} from "../src/lib/billing/gating";
import { mapStripeStatusToSubscriptionStatus } from "../src/lib/billing/webhook-processor";
import { getBillingAdapter } from "../src/lib/billing/adapter";
import { getPlanByCode } from "../src/lib/plans";

test("PlanLimitExceededError contains complete metadata for UI alerting", () => {
  const err = new PlanLimitExceededError({
    metric: "AGENTS",
    current: 5,
    limit: 5,
    tenantId: "tenant_123",
  });

  assert.equal(err.name, "PlanLimitExceededError");
  assert.equal(err.metric, "AGENTS");
  assert.equal(err.current, 5);
  assert.equal(err.limit, 5);
  assert.equal(err.tenantId, "tenant_123");
  assert.ok(err.message.includes("AGENTS"));
});

test("FeatureNotIncludedError identifies missing enterprise features", () => {
  const err = new FeatureNotIncludedError({
    featureKey: "dedicated_csm",
    tenantId: "tenant_456",
  });

  assert.equal(err.name, "FeatureNotIncludedError");
  assert.equal(err.featureKey, "dedicated_csm");
  assert.equal(err.tenantId, "tenant_456");
  assert.ok(err.message.includes("dedicated_csm"));
});

test("mapStripeStatusToSubscriptionStatus correctly normalizes Stripe lifecycle states", () => {
  assert.equal(mapStripeStatusToSubscriptionStatus("active"), "ACTIVE");
  assert.equal(mapStripeStatusToSubscriptionStatus("trialing"), "TRIALING");
  assert.equal(mapStripeStatusToSubscriptionStatus("past_due"), "PAST_DUE");
  assert.equal(mapStripeStatusToSubscriptionStatus("canceled"), "CANCELED");
  assert.equal(mapStripeStatusToSubscriptionStatus("unpaid"), "UNPAID");
  assert.equal(mapStripeStatusToSubscriptionStatus("paused"), "PAUSED");
  assert.equal(mapStripeStatusToSubscriptionStatus("incomplete"), "INCOMPLETE");
  assert.equal(mapStripeStatusToSubscriptionStatus("incomplete_expired"), "INCOMPLETE_EXPIRED");
  assert.equal(mapStripeStatusToSubscriptionStatus("unknown_status"), "ACTIVE");
});

test("BillingAdapter creates safe fallback / checkout session without live credentials in test mode", async () => {
  const adapter = getBillingAdapter("STRIPE");
  assert.ok(adapter);

  const checkout = await adapter.createCheckoutSession({
    tenantId: "test_tenant_id",
    tenantSlug: "test-slug",
    customerEmail: "owner@test.local",
    customerName: "Test Owner",
    planCode: "PROFESSIONAL",
    interval: "MONTHLY",
    successUrl: "http://localhost:3000/ar/app/test-slug/settings/billing?status=success",
    cancelUrl: "http://localhost:3000/ar/app/test-slug/settings/billing?status=canceled",
  });

  assert.ok(checkout.url);
  assert.ok(checkout.sessionId);
  assert.ok(checkout.url.includes("test-slug"));
});

test("Plan pricing and feature tier hierarchy enforces Starter -> Pro -> Enterprise capabilities", () => {
  const starter = getPlanByCode("STARTER");
  const pro = getPlanByCode("PROFESSIONAL");
  const enterprise = getPlanByCode("ENTERPRISE");

  assert.ok(starter.features.includes("core_helpdesk"));
  assert.ok(!starter.features.includes("advanced_sla"));
  assert.ok(pro.features.includes("advanced_sla"));
  assert.ok(!pro.features.includes("dedicated_csm"));
  assert.ok(enterprise.features.includes("dedicated_csm"));
  assert.ok(enterprise.features.includes("sso_saml"));

  // Check agent seats limit progression
  assert.equal(starter.limits.AGENTS, 3);
  assert.equal(pro.limits.AGENTS, 15);
  assert.equal(enterprise.limits.AGENTS, null); // Unlimited
});
