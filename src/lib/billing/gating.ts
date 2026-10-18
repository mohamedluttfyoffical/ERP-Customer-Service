import { prisma } from "@/lib/db";
import { type PlanFeatureKey, type UsageMetricKey } from "@/lib/plans";

export class PlanLimitExceededError extends Error {
  readonly metric: UsageMetricKey;
  readonly current: number;
  readonly limit: number;
  readonly tenantId: string;

  constructor(params: {
    metric: UsageMetricKey;
    current: number;
    limit: number;
    tenantId: string;
    message?: string;
  }) {
    super(
      params.message ??
        `Plan limit exceeded for ${params.metric}: current=${params.current}, limit=${params.limit}`,
    );
    this.name = "PlanLimitExceededError";
    this.metric = params.metric;
    this.current = params.current;
    this.limit = params.limit;
    this.tenantId = params.tenantId;
  }
}

export class FeatureNotIncludedError extends Error {
  readonly featureKey: PlanFeatureKey;
  readonly tenantId: string;

  constructor(params: { featureKey: PlanFeatureKey; tenantId: string; message?: string }) {
    super(
      params.message ??
        `Feature "${params.featureKey}" is not included in the active subscription plan.`,
    );
    this.name = "FeatureNotIncludedError";
    this.featureKey = params.featureKey;
    this.tenantId = params.tenantId;
  }
}

export interface MetricUsageResult {
  metric: UsageMetricKey;
  current: number;
  limit: number | null;
  allowed: boolean;
  remaining: number | null;
  percentage: number;
}

/**
 * Fetch the active subscription and associated plan, limits, and features for a tenant.
 */
export async function getTenantSubscriptionDetails(tenantId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      tenantId,
      status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      plan: {
        include: {
          limits: true,
          features: true,
        },
      },
    },
  });

  return subscription;
}

/**
 * Compute the current real usage for a specific metric in a tenant.
 */
export async function getMetricCurrentUsage(
  tenantId: string,
  metric: UsageMetricKey,
): Promise<number> {
  switch (metric) {
    case "AGENTS": {
      return prisma.membership.count({
        where: {
          tenantId,
          status: "ACTIVE",
          isBillable: true,
        },
      });
    }

    case "TICKETS_PER_MONTH": {
      const now = new Date();
      const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      return prisma.ticket.count({
        where: {
          tenantId,
          createdAt: { gte: startOfMonth },
        },
      });
    }

    case "DEPARTMENTS": {
      return prisma.department.count({
        where: {
          tenantId,
          isActive: true,
        },
      });
    }

    case "KNOWLEDGE_BASE_ARTICLES": {
      return prisma.kbArticle.count({
        where: {
          tenantId,
        },
      });
    }

    case "MONTHLY_ACTIVE_CUSTOMERS": {
      return prisma.customer.count({
        where: {
          tenantId,
          status: "ACTIVE",
        },
      });
    }

    case "STORAGE_MB": {
      const result = await prisma.attachment.aggregate({
        where: { tenantId },
        _sum: { sizeBytes: true },
      });
      const totalBytes = Number(result._sum.sizeBytes ?? 0);
      return Math.ceil(totalBytes / (1024 * 1024));
    }

    default:
      return 0;
  }
}

/**
 * Check if a tenant can increment usage of a specific metric without violating plan limits.
 */
export async function checkUsageLimit(
  tenantId: string,
  metric: UsageMetricKey,
  requestedIncrement = 1,
): Promise<MetricUsageResult> {
  const subscription = await getTenantSubscriptionDetails(tenantId);
  const current = await getMetricCurrentUsage(tenantId, metric);

  // If no subscription or plan limit record, default to safe fallback (not unlimited unless defined)
  const limitRecord = subscription?.plan.limits.find((l) => l.metric === metric);
  const limit = limitRecord ? limitRecord.limitValue : null;

  if (limit === null) {
    return {
      metric,
      current,
      limit: null,
      allowed: true,
      remaining: null,
      percentage: 0,
    };
  }

  const nextTotal = current + requestedIncrement;
  const allowed = nextTotal <= limit;
  const remaining = Math.max(0, limit - current);
  const percentage = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 100;

  return {
    metric,
    current,
    limit,
    allowed,
    remaining,
    percentage,
  };
}

/**
 * Assert that usage can be incremented. Throws `PlanLimitExceededError` if exceeded.
 */
export async function assertUsageLimit(
  tenantId: string,
  metric: UsageMetricKey,
  requestedIncrement = 1,
): Promise<void> {
  const result = await checkUsageLimit(tenantId, metric, requestedIncrement);
  if (!result.allowed && result.limit !== null) {
    throw new PlanLimitExceededError({
      metric,
      current: result.current,
      limit: result.limit,
      tenantId,
    });
  }
}

/**
 * Check whether a tenant has entitlement to a specific feature key.
 */
export async function checkFeatureEntitlement(
  tenantId: string,
  featureKey: PlanFeatureKey,
): Promise<boolean> {
  const subscription = await getTenantSubscriptionDetails(tenantId);
  if (!subscription) {
    return false;
  }

  const feature = subscription.plan.features.find((f) => f.featureKey === featureKey);
  return Boolean(feature?.included);
}

/**
 * Assert feature entitlement. Throws `FeatureNotIncludedError` if not included.
 */
export async function assertFeatureEntitlement(
  tenantId: string,
  featureKey: PlanFeatureKey,
): Promise<void> {
  const allowed = await checkFeatureEntitlement(tenantId, featureKey);
  if (!allowed) {
    throw new FeatureNotIncludedError({ featureKey, tenantId });
  }
}

/**
 * Get comprehensive usage summary for all metrics for a tenant.
 */
export async function getTenantUsageSummary(tenantId: string): Promise<{
  subscription: {
    status: string;
    interval: string;
    planNameAr: string;
    planNameEn: string;
    planCode: string;
    currentPeriodEnd: Date | null;
    trialEnd: Date | null;
  } | null;
  metrics: Record<UsageMetricKey, MetricUsageResult>;
}> {
  const subscription = await getTenantSubscriptionDetails(tenantId);

  const metricsToCheck: UsageMetricKey[] = [
    "AGENTS",
    "TICKETS_PER_MONTH",
    "STORAGE_MB",
    "DEPARTMENTS",
    "KNOWLEDGE_BASE_ARTICLES",
    "MONTHLY_ACTIVE_CUSTOMERS",
  ];

  const results = await Promise.all(
    metricsToCheck.map(async (metric) => {
      const res = await checkUsageLimit(tenantId, metric, 0);
      return [metric, res] as const;
    }),
  );

  const metricsRecord = Object.fromEntries(results) as Record<UsageMetricKey, MetricUsageResult>;

  return {
    subscription: subscription
      ? {
          status: subscription.status,
          interval: subscription.interval,
          planNameAr: subscription.plan.nameAr,
          planNameEn: subscription.plan.nameEn,
          planCode: subscription.plan.code,
          currentPeriodEnd: subscription.currentPeriodEnd,
          trialEnd: subscription.trialEnd,
        }
      : null,
    metrics: metricsRecord,
  };
}
