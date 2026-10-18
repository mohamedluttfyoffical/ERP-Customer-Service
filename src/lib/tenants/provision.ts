import {
  BillingInterval,
  BillingProvider,
  PlanStatus,
  SubscriptionStatus,
  TenantStatus,
  TicketPriority,
  type Locale,
  type Prisma,
  type RoleKey,
} from "@prisma/client";

import { SYSTEM_ROLES, SYSTEM_ROLE_PERMISSIONS, type StaffRoleKey } from "@/lib/permissions";
import type { PlanCode } from "@/lib/plans";

const ROLE_SLUGS: Record<StaffRoleKey, string> = {
  OWNER: "owner",
  ADMIN: "admin",
  AGENT: "agent",
  TECHNICIAN: "technician",
  BILLING: "billing",
};

const DEPARTMENT_COPY = {
  ar: {
    technical: "الدعم الفني",
    billing: "الفواتير",
    calendar: "ساعات العمل الافتراضية",
    sla: "سياسة SLA الافتراضية",
    slaDescription: "أهداف الاستجابة والحل لكل مستوى أولوية.",
  },
  en: {
    technical: "Technical Support",
    billing: "Billing",
    calendar: "Default business hours",
    sla: "Default SLA policy",
    slaDescription: "First-response and resolution targets by priority.",
  },
} as const;

const SLA_TARGETS = [
  { priority: TicketPriority.LOW, firstResponseMinutes: 480, resolutionMinutes: 2880 },
  { priority: TicketPriority.MEDIUM, firstResponseMinutes: 240, resolutionMinutes: 1440 },
  { priority: TicketPriority.HIGH, firstResponseMinutes: 60, resolutionMinutes: 480 },
  { priority: TicketPriority.URGENT, firstResponseMinutes: 30, resolutionMinutes: 240 },
] as const;

export type ProvisionTenantInput = {
  ownerUserId: string;
  ownerName: string;
  companyName: string;
  slug: string;
  email: string;
  locale: "ar" | "en";
  planCode: PlanCode;
  interval: "MONTHLY" | "ANNUAL";
};

export class TenantProvisioningError extends Error {
  constructor(
    message: string,
    public readonly code: "PLAN_NOT_CONFIGURED" | "PLAN_PRICE_NOT_CONFIGURED",
  ) {
    super(message);
    this.name = "TenantProvisioningError";
  }
}

/**
 * Provision all non-negotiable tenant defaults inside the caller's transaction.
 * No partial workspace can exist because user, owner membership and billing
 * trial commit atomically with the tenant row.
 */
export async function provisionTenant(
  tx: Prisma.TransactionClient,
  input: ProvisionTenantInput,
): Promise<{ tenantId: string; slug: string }> {
  const copy = DEPARTMENT_COPY[input.locale];
  const plan = await tx.plan.findUnique({
    where: { code: input.planCode },
    include: {
      prices: {
        where: {
          currency: "USD",
          interval: input.interval === "ANNUAL" ? BillingInterval.ANNUAL : BillingInterval.MONTHLY,
          isActive: true,
        },
      },
    },
  });

  if (!plan || plan.status !== PlanStatus.ACTIVE) {
    throw new TenantProvisioningError("Plan is not configured", "PLAN_NOT_CONFIGURED");
  }

  const price = plan.prices[0];
  if (!price) {
    throw new TenantProvisioningError("Plan price is not configured", "PLAN_PRICE_NOT_CONFIGURED");
  }

  const startedAt = new Date();
  const trialEndsAt = new Date(startedAt.getTime() + plan.trialDays * 24 * 60 * 60 * 1000);

  const tenant = await tx.tenant.create({
    data: {
      slug: input.slug,
      name: input.companyName,
      legalName: input.companyName,
      email: input.email,
      status: TenantStatus.TRIALING,
      defaultLocale: input.locale.toUpperCase() as Locale,
      timezone: "Asia/Riyadh",
      currency: "USD",
      countryCode: "SA",
      trialEndsAt,
      settings: {
        create: {
          supportEmail: input.email,
          brandPrimaryColor: "#0f766e",
          brandAccentColor: "#14b8a6",
          emailNotifications: true,
          inAppNotifications: true,
          slaWarningMinutes: 60,
        },
      },
    },
  });

  const roles: Record<StaffRoleKey, string> = {} as Record<StaffRoleKey, string>;
  for (const roleKey of Object.keys(SYSTEM_ROLE_PERMISSIONS) as StaffRoleKey[]) {
    const meta = SYSTEM_ROLES[roleKey];
    const role = await tx.role.create({
      data: {
        tenantId: tenant.id,
        key: roleKey as RoleKey,
        slug: ROLE_SLUGS[roleKey],
        name: meta.nameAr,
        description: meta.descriptionAr,
        permissions: [...SYSTEM_ROLE_PERMISSIONS[roleKey]],
        isSystem: true,
        isDefault: roleKey === "AGENT",
      },
    });
    roles[roleKey] = role.id;
  }

  await tx.membership.create({
    data: {
      tenantId: tenant.id,
      userId: input.ownerUserId,
      roleId: roles.OWNER,
      title: input.locale === "ar" ? "مالك الشركة" : "Owner",
      status: "ACTIVE",
      joinedAt: startedAt,
    },
  });

  const technical = await tx.department.create({
    data: {
      tenantId: tenant.id,
      name: copy.technical,
      slug: "technical-support",
      color: "#0f766e",
      isDefault: true,
      email: input.email,
    },
  });
  await tx.department.create({
    data: {
      tenantId: tenant.id,
      name: copy.billing,
      slug: "billing",
      color: "#b45309",
      email: input.email,
    },
  });

  const calendar = await tx.businessCalendar.create({
    data: {
      tenantId: tenant.id,
      name: copy.calendar,
      timezone: "Asia/Riyadh",
      isDefault: true,
    },
  });

  const workingDays = new Set([7, 1, 2, 3, 4]);
  await tx.businessHour.createMany({
    data: [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
      tenantId: tenant.id,
      calendarId: calendar.id,
      dayOfWeek,
      startMinute: 540,
      endMinute: 1020,
      isEnabled: workingDays.has(dayOfWeek),
    })),
  });

  const slaPolicy = await tx.slaPolicy.create({
    data: {
      tenantId: tenant.id,
      name: copy.sla,
      description: copy.slaDescription,
      isDefault: true,
      isActive: true,
      businessCalendarId: calendar.id,
      pauseOnPendingCustomer: true,
    },
  });

  await tx.slaTarget.createMany({
    data: SLA_TARGETS.map((target) => ({
      tenantId: tenant.id,
      slaPolicyId: slaPolicy.id,
      ...target,
    })),
  });

  await tx.department.update({
    where: { id: technical.id },
    data: { defaultSlaPolicyId: slaPolicy.id },
  });

  await tx.sequence.createMany({
    data: [
      "ticket",
      "work_order",
      "quotation",
      "sales_invoice",
      "subscription_invoice",
      "customer",
    ].map((key) => ({ tenantId: tenant.id, key })),
  });

  await tx.subscription.create({
    data: {
      tenantId: tenant.id,
      planId: plan.id,
      planPriceId: price.id,
      interval: price.interval,
      status: SubscriptionStatus.TRIALING,
      provider: BillingProvider.MANUAL,
      seats: 1,
      unitAmount: price.amount,
      currency: price.currency,
      trialStart: startedAt,
      trialEnd: trialEndsAt,
      startedAt,
      currentPeriodStart: startedAt,
      currentPeriodEnd: trialEndsAt,
    },
  });

  await tx.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorType: "USER",
      actorUserId: input.ownerUserId,
      action: "tenant.created",
      entityType: "Tenant",
      entityId: tenant.id,
      after: {
        slug: tenant.slug,
        planCode: plan.code,
        interval: price.interval,
        ownerName: input.ownerName,
      },
    },
  });

  return { tenantId: tenant.id, slug: tenant.slug };
}
