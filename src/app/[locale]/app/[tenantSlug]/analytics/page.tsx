import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  BarChart3,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Smile,
  DollarSign,
  Flame,
  Send,
  Building2,
} from "lucide-react";
import { getTenantAccess, hasTenantPermission } from "@/lib/tenants/context";
import { getTenantAnalytics } from "@/lib/analytics/data";
import { type TicketPriority, type TicketChannel } from "@prisma/client";

interface AnalyticsPageProps {
  params: Promise<{
    locale: string;
    tenantSlug: string;
  }>;
}

const priorityColors: Record<TicketPriority, string> = {
  URGENT: "bg-destructive text-destructive-foreground",
  HIGH: "bg-amber-500 text-white",
  MEDIUM: "bg-primary text-primary-foreground",
  LOW: "bg-muted-foreground text-background",
};

export default async function AnalyticsPage(props: AnalyticsPageProps) {
  const { locale, tenantSlug } = await props.params;

  const access = await getTenantAccess(locale, tenantSlug);

  if (!hasTenantPermission(access, "analytics:read")) {
    notFound();
  }

  const t = await getTranslations("Analytics");
  const analytics = await getTenantAnalytics(access.tenant.id);
  const {
    kpis,
    priorityDistribution,
    channelDistribution,
    trend,
    topDepartments,
    operationsSummary,
  } = analytics;

  const maxTrend = Math.max(
    ...trend.map((t) => Math.max(t.created, t.resolved)),
    1
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <BarChart3 className="size-5" />
          </span>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {t("title")}
          </h1>
        </div>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {t("subtitle")}
        </p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
        {/* Resolution Rate */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">{t("kpis.resolutionRate")}</span>
            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {kpis.resolutionRate}%
          </div>
          <span className="text-[10px] text-muted-foreground block mt-0.5">
            {kpis.resolvedTickets} / {kpis.totalTickets} {t("ticketsUnit")}
          </span>
        </div>

        {/* SLA Compliance */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">{t("kpis.slaCompliance")}</span>
            <ShieldCheck className="size-3.5 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary font-mono">
            {kpis.slaComplianceRate}%
          </div>
          <span className="text-[10px] text-muted-foreground block mt-0.5">
            {t("slaGuaranteedLabel")}
          </span>
        </div>

        {/* Avg First Response */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">{t("kpis.avgFirstResponse")}</span>
            <Clock className="size-3.5 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground font-mono">
            {kpis.avgFirstResponseMinutes}
            <span className="text-xs font-normal ms-1 text-muted-foreground">{t("minutesUnit")}</span>
          </div>
          <span className="text-[10px] text-muted-foreground block mt-0.5">
            {t("responseSpeedLabel")}
          </span>
        </div>

        {/* Avg Resolution Time */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">{t("kpis.avgResolutionTime")}</span>
            <Clock className="size-3.5 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground font-mono">
            {kpis.avgResolutionHours}
            <span className="text-xs font-normal ms-1 text-muted-foreground">{t("hoursUnit")}</span>
          </div>
          <span className="text-[10px] text-muted-foreground block mt-0.5">
            {t("resolutionSpeedLabel")}
          </span>
        </div>

        {/* CSAT Score */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">{t("kpis.csatScore")}</span>
            <Smile className="size-3.5 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground font-mono">
            {kpis.csatScore}
            <span className="text-xs font-normal ms-1 text-muted-foreground">/ 5.0</span>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
            ★ {t("customerSatisfactionLabel")}
          </span>
        </div>

        {/* Pipeline Value */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">{t("kpis.pipelineValue")}</span>
            <DollarSign className="size-3.5 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground font-mono">
            ${operationsSummary.quotationsTotalValue.toFixed(0)}
          </div>
          <span className="text-[10px] text-muted-foreground block mt-0.5">
            {operationsSummary.workOrdersCount} {t("workOrdersUnit")}
          </span>
        </div>
      </div>

      {/* 14-Day Activity Trend Chart */}
      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50 pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">{t("trend.title")}</h3>
            <p className="text-xs text-muted-foreground">{t("trend.subtitle")}</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="size-2.5 rounded-full bg-primary" />
              <span>{t("trend.created")}</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              <span>{t("trend.resolved")}</span>
            </span>
          </div>
        </div>

        {/* Bar chart visualization */}
        <div className="h-48 flex items-end gap-2 pt-4 px-2">
          {trend.map((day) => {
            const createdHeight = Math.round((day.created / maxTrend) * 100);
            const resolvedHeight = Math.round((day.resolved / maxTrend) * 100);

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center h-full justify-end group gap-1"
              >
                <div className="w-full flex items-end justify-center gap-1 h-36">
                  <div
                    style={{ height: `${Math.max(createdHeight, 4)}%` }}
                    className="w-1/2 max-w-[12px] bg-primary rounded-t-sm transition-all group-hover:opacity-80"
                    title={`${day.created} created`}
                  />
                  <div
                    style={{ height: `${Math.max(resolvedHeight, 4)}%` }}
                    className="w-1/2 max-w-[12px] bg-emerald-500 rounded-t-sm transition-all group-hover:opacity-80"
                    title={`${day.resolved} resolved`}
                  />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground mt-1">
                  {day.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Priorities & Channels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Priority Breakdown */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("priorityBreakdown.title")}
            </h3>
            <Flame className="size-4 text-primary" />
          </div>

          <div className="space-y-3">
            {(["URGENT", "HIGH", "MEDIUM", "LOW"] as TicketPriority[]).map((pri) => {
              const count = priorityDistribution[pri] || 0;
              const pct =
                kpis.totalTickets > 0
                  ? Math.round((count / kpis.totalTickets) * 100)
                  : 0;

              return (
                <div key={pri} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className={`size-2 rounded-full ${priorityColors[pri]}`} />
                      <span>{t(`priorities.${pri}`)}</span>
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${priorityColors[pri]}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Channel Breakdown */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("channelBreakdown.title")}
            </h3>
            <Send className="size-4 text-primary" />
          </div>

          <div className="space-y-3">
            {(["PORTAL", "EMAIL", "PHONE", "API", "CHAT"] as TicketChannel[]).map((ch) => {
              const count = channelDistribution[ch] || 0;
              const pct =
                kpis.totalTickets > 0
                  ? Math.round((count / kpis.totalTickets) * 100)
                  : 0;

              return (
                <div key={ch} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span>{t(`channels.${ch}`)}</span>
                    <span className="font-mono text-muted-foreground">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Department Workload */}
      {topDepartments.length > 0 && (
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("departmentWorkload.title")}
            </h3>
            <Building2 className="size-4 text-primary" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {topDepartments.map((dept) => (
              <div
                key={dept.name}
                className="rounded-xl border border-border/60 bg-muted/20 p-3.5 text-xs"
              >
                <span className="font-bold text-foreground block truncate">
                  {dept.name}
                </span>
                <span className="mt-1 text-xl font-bold font-mono text-primary block">
                  {dept.ticketCount}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {t("ticketsUnit")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
