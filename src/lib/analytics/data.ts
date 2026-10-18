import {
  calculateAverageFirstResponseMinutes,
  calculateAverageResolutionHours,
  calculateCsatScore,
  calculateResolutionRate,
  calculateSlaComplianceRate,
} from "@/lib/analytics/metrics";
import { prisma } from "@/lib/db";
import {
  type TicketPriority,
  type TicketStatus,
  type TicketChannel,
} from "@prisma/client";

export interface AnalyticsSummary {
  kpis: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    resolutionRate: number;
    slaComplianceRate: number;
    avgFirstResponseMinutes: number;
    avgResolutionHours: number;
    csatScore: number;
  };
  priorityDistribution: Record<TicketPriority, number>;
  statusDistribution: Record<TicketStatus, number>;
  channelDistribution: Record<TicketChannel, number>;
  trend: Array<{
    date: string;
    created: number;
    resolved: number;
  }>;
  topDepartments: Array<{
    name: string;
    ticketCount: number;
  }>;
  operationsSummary: {
    workOrdersCount: number;
    quotationsTotalValue: number;
    trackedAssetsCount: number;
  };
}

export async function getTenantAnalytics(
  tenantId: string
): Promise<AnalyticsSummary> {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    tickets,
    workOrdersCount,
    quotations,
    assetsCount,
    departments,
    csatResponses,
  ] = await Promise.all([
    prisma.ticket.findMany({
      where: { tenantId },
      select: {
        id: true,
        status: true,
        priority: true,
        channel: true,
        departmentId: true,
        firstResponseDueAt: true,
        resolutionDueAt: true,
        firstRespondedAt: true,
        resolvedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workOrder.count({ where: { tenantId } }),
    prisma.quotation.findMany({
      where: { tenantId },
      select: { total: true },
    }),
    prisma.asset.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.department.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    }),
    prisma.csatResponse.findMany({
      where: { tenantId },
      select: { rating: true },
    }),
  ]);

  const totalTickets = tickets.length;
  let openTickets = 0;
  let resolvedTickets = 0;
  let slaMetCount = 0;
  let slaEligibleCount = 0;
  let totalFirstResponseMinutes = 0;
  let firstResponseSampleCount = 0;
  let totalResolutionHours = 0;
  let resolutionSampleCount = 0;

  const priorityDistribution: Record<TicketPriority, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    URGENT: 0,
  };

  const statusDistribution: Record<TicketStatus, number> = {
    OPEN: 0,
    IN_PROGRESS: 0,
    PENDING_CUSTOMER: 0,
    ESCALATED: 0,
    RESOLVED: 0,
    CLOSED: 0,
  };

  const channelDistribution: Record<TicketChannel, number> = {
    PORTAL: 0,
    EMAIL: 0,
    PHONE: 0,
    API: 0,
    CHAT: 0,
    WHATSAPP: 0,
  };

  const departmentCounts: Record<string, number> = {};

  // Initialize 14 days map
  const trendMap = new Map<string, { created: number; resolved: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(5, 10); // MM-DD
    trendMap.set(key, { created: 0, resolved: 0 });
  }

  for (const t of tickets) {
    // Status
    statusDistribution[t.status] = (statusDistribution[t.status] || 0) + 1;
    if (t.status === "RESOLVED" || t.status === "CLOSED") {
      resolvedTickets++;
    } else {
      openTickets++;
    }

    // Priority
    priorityDistribution[t.priority] =
      (priorityDistribution[t.priority] || 0) + 1;

    // Channel
    channelDistribution[t.channel] =
      (channelDistribution[t.channel] || 0) + 1;

    // Department
    if (t.departmentId) {
      departmentCounts[t.departmentId] =
        (departmentCounts[t.departmentId] || 0) + 1;
    }

    // SLA tracking
    if (t.resolutionDueAt && t.resolvedAt) {
      slaEligibleCount++;
      if (t.resolvedAt <= t.resolutionDueAt) {
        slaMetCount++;
      }
    }

    // Response times
    if (t.firstRespondedAt) {
      const diffMs = t.firstRespondedAt.getTime() - t.createdAt.getTime();
      const mins = Math.max(0, Math.round(diffMs / (60 * 1000)));
      totalFirstResponseMinutes += mins;
      firstResponseSampleCount++;
    }

    if (t.resolvedAt) {
      const diffMs = t.resolvedAt.getTime() - t.createdAt.getTime();
      const hours = Math.max(0, diffMs / (60 * 60 * 1000));
      totalResolutionHours += hours;
      resolutionSampleCount++;
    }

    // Daily trend
    if (t.createdAt >= fourteenDaysAgo) {
      const key = t.createdAt.toISOString().slice(5, 10);
      const entry = trendMap.get(key);
      if (entry) {
        entry.created++;
      }
    }

    if (t.resolvedAt && t.resolvedAt >= fourteenDaysAgo) {
      const key = t.resolvedAt.toISOString().slice(5, 10);
      const entry = trendMap.get(key);
      if (entry) {
        entry.resolved++;
      }
    }
  }

  const resolutionRate = calculateResolutionRate(resolvedTickets, totalTickets);
  const slaComplianceRate = calculateSlaComplianceRate(
    slaMetCount,
    slaEligibleCount
  );
  const avgFirstResponseMinutes = calculateAverageFirstResponseMinutes(
    totalFirstResponseMinutes,
    firstResponseSampleCount
  );
  const avgResolutionHours = calculateAverageResolutionHours(
    totalResolutionHours,
    resolutionSampleCount
  );
  const csatScore = calculateCsatScore(csatResponses.map((r) => r.rating));

  const quotationsTotalValue = quotations.reduce(
    (acc, q) => acc + Number(q.total.toString()),
    0
  );

  const topDepartments = departments
    .map((dept) => ({
      name: dept.name,
      ticketCount: departmentCounts[dept.id] || 0,
    }))
    .sort((a, b) => b.ticketCount - a.ticketCount)
    .slice(0, 5);

  const trend = Array.from(trendMap.entries()).map(([date, counts]) => ({
    date,
    created: counts.created,
    resolved: counts.resolved,
  }));

  return {
    kpis: {
      totalTickets,
      openTickets,
      resolvedTickets,
      resolutionRate,
      slaComplianceRate,
      avgFirstResponseMinutes,
      avgResolutionHours,
      csatScore,
    },
    priorityDistribution,
    statusDistribution,
    channelDistribution,
    trend,
    topDepartments,
    operationsSummary: {
      workOrdersCount,
      quotationsTotalValue,
      trackedAssetsCount: assetsCount,
    },
  };
}
