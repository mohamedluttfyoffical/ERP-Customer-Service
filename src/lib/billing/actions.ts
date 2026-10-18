"use server";

import { revalidatePath } from "next/cache";
import { type BillingInterval } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { getPlanByCode, type PlanCode } from "@/lib/plans";
import { getBillingAdapter } from "@/lib/billing/adapter";
import { getTenantAccess, hasTenantPermission } from "@/lib/tenants/context";

export type BillingActionResult =
  | { success: true; url?: string; message?: string }
  | { success: false; error: string };

export async function createCheckoutSessionAction(params: {
  tenantSlug: string;
  planCode: PlanCode;
  interval: BillingInterval;
  locale: string;
}): Promise<BillingActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    if (!hasTenantPermission(access, "billing:manage")) {
      return { success: false, error: "Settings.errors.forbidden" };
    }

    const env = getServerEnv();
    const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const baseUrl = `${appUrl}/${params.locale}/app/${params.tenantSlug}/settings/billing`;

    const adapter = getBillingAdapter("STRIPE");
    const result = await adapter.createCheckoutSession({
      tenantId: access.tenant.id,
      tenantSlug: access.tenant.slug,
      customerEmail: access.user.email,
      customerName: access.user.name ?? access.user.email,
      planCode: params.planCode,
      interval: params.interval,
      successUrl: `${baseUrl}?billing_status=success`,
      cancelUrl: `${baseUrl}?billing_status=canceled`,
    });

    return { success: true, url: result.url };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to initiate checkout session.",
    };
  }
}

export async function createCustomerPortalSessionAction(params: {
  tenantSlug: string;
  locale: string;
}): Promise<BillingActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    if (!hasTenantPermission(access, "billing:manage")) {
      return { success: false, error: "Settings.errors.forbidden" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: access.tenant.id },
      select: { stripeCustomerId: true },
    });

    if (!tenant?.stripeCustomerId) {
      return {
        success: false,
        error: "No active Stripe customer found. Please subscribe to a paid plan first.",
      };
    }

    const env = getServerEnv();
    const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const returnUrl = `${appUrl}/${params.locale}/app/${params.tenantSlug}/settings/billing`;

    const adapter = getBillingAdapter("STRIPE");
    const result = await adapter.createPortalSession({
      tenantId: access.tenant.id,
      tenantSlug: access.tenant.slug,
      stripeCustomerId: tenant.stripeCustomerId,
      returnUrl,
    });

    return { success: true, url: result.url };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to open customer portal.",
    };
  }
}

export async function upgradeTenantPlanDirectAction(params: {
  tenantSlug: string;
  planCode: PlanCode;
  interval: BillingInterval;
  locale: string;
}): Promise<BillingActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    if (!hasTenantPermission(access, "billing:manage")) {
      return { success: false, error: "Settings.errors.forbidden" };
    }

    const plan = getPlanByCode(params.planCode);
    const dbPlan = await prisma.plan.findUnique({
      where: { code: params.planCode },
      include: { prices: true },
    });

    if (!dbPlan) {
      return { success: false, error: "Plan not found." };
    }

    const planPrice = dbPlan.prices.find((p) => p.interval === params.interval);
    const amount = planPrice?.amount ?? Number(plan.prices[params.interval]);

    const existingSub = await prisma.subscription.findFirst({
      where: { tenantId: access.tenant.id },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const periodEnd = new Date(now);
    if (params.interval === "ANNUAL") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    let subId: string;

    if (existingSub) {
      const updated = await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          planId: dbPlan.id,
          planPriceId: planPrice?.id,
          interval: params.interval,
          status: "ACTIVE",
          unitAmount: amount,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEnd: null,
        },
      });
      subId = updated.id;
    } else {
      const created = await prisma.subscription.create({
        data: {
          tenantId: access.tenant.id,
          planId: dbPlan.id,
          planPriceId: planPrice?.id,
          interval: params.interval,
          status: "ACTIVE",
          provider: "MANUAL",
          unitAmount: amount,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });
      subId = created.id;
    }

    // Activate tenant if was trialing or past due
    await prisma.tenant.update({
      where: { id: access.tenant.id },
      data: {
        status: "ACTIVE",
        activatedAt: now,
        suspendedAt: null,
      },
    });

    // Record invoice
    const invNumber = `INV-${Date.now().toString().slice(-8)}`;
    await prisma.subscriptionInvoice.create({
      data: {
        tenantId: access.tenant.id,
        subscriptionId: subId,
        number: invNumber,
        status: "PAID",
        currency: "USD",
        subtotal: amount,
        total: amount,
        amountPaid: amount,
        periodStart: now,
        periodEnd,
        paidAt: now,
        lines: {
          create: {
            tenantId: access.tenant.id,
            description: `${dbPlan.nameEn} Plan (${params.interval})`,
            quantity: 1,
            unitAmount: amount,
            amount,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: access.tenant.id,
        actorUserId: access.user.id,
        actorType: "USER",
        action: "subscription.plan_upgraded",
        entityType: "Subscription",
        entityId: subId,
        after: {
          planCode: params.planCode,
          interval: params.interval,
          amount: amount.toString(),
        },
      },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/settings`);
    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/settings/billing`);

    return { success: true, message: "Subscription upgraded successfully." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to upgrade plan.",
    };
  }
}
