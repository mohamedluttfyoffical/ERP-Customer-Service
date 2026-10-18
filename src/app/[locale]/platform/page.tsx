import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Activity,
  ArrowUpRight,
  Building2,
  DollarSign,
  Layers,
  ShieldAlert,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/session";
import { localizePlan } from "@/lib/tenants/presentation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type PlatformPageProps = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "App.nav" });
  return { title: t("platform") };
}

const statusVariant = {
  PROVISIONING: "secondary",
  TRIALING: "warning",
  ACTIVE: "success",
  PAST_DUE: "destructive",
  SUSPENDED: "destructive",
  CANCELED: "secondary",
} as const;

export default async function PlatformPage({ params }: PlatformPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin(locale);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    tenantCount,
    userCount,
    activeSubscriptions,
    trialSubscriptions,
    canceledRecentSubscriptions,
    subscriptionsList,
    recentTenants,
    t,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "TRIALING" } }),
    prisma.subscription.count({
      where: {
        status: "CANCELED",
        canceledAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      select: { unitAmount: true, interval: true },
    }),
    prisma.tenant.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        trialEndsAt: true,
        subscriptions: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            status: true,
            interval: true,
            plan: { select: { nameAr: true, nameEn: true } },
          },
        },
      },
    }),
    getTranslations("Platform"),
  ]);

  // Compute MRR & ARR
  let mrr = 0;
  for (const sub of subscriptionsList) {
    const amount = Number(sub.unitAmount);
    if (sub.interval === "ANNUAL") {
      mrr += amount / 12;
    } else {
      mrr += amount;
    }
  }
  const arr = mrr * 12;

  // Churn rate in last 30 days
  const baseSubscribers = activeSubscriptions + canceledRecentSubscriptions;
  const churnRate =
    baseSubscribers > 0
      ? ((canceledRecentSubscriptions / baseSubscribers) * 100).toFixed(1)
      : "0.0";

  const number = new Intl.NumberFormat(locale);
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  const metrics = [
    {
      label: t("revenue.mrr"),
      value: currencyFormatter.format(mrr),
      subValue: `${t("revenue.arr")}: ${currencyFormatter.format(arr)}`,
      icon: DollarSign,
      tone: "text-success bg-success/10 border-success/20",
    },
    {
      label: t("stats.tenants"),
      value: number.format(tenantCount),
      subValue: `${number.format(activeSubscriptions)} ${t("stats.active")}`,
      icon: Building2,
      tone: "text-primary bg-primary/10 border-primary/20",
    },
    {
      label: t("stats.trials"),
      value: number.format(trialSubscriptions),
      subValue: `${churnRate}% ${t("revenue.churnRate")}`,
      icon: Activity,
      tone: "text-warning bg-warning/10 border-warning/20",
    },
    {
      label: t("stats.users"),
      value: number.format(userCount),
      subValue: t("stats.allPlatformUsers"),
      icon: Users,
      tone: "text-chart-2 bg-chart-2/10 border-chart-2/20",
    },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">{t("eyebrow")}</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Badge variant="outline" className="w-fit bg-card">
          <Activity aria-hidden="true" className="size-3 text-primary me-1.5" />
          Phase 3 Complete
        </Badge>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {metrics.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                {stat.label}
              </p>
              <span className={cn("grid size-8 place-items-center rounded-xl border", stat.tone)}>
                <stat.icon aria-hidden="true" className="size-4" />
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{stat.subValue}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Access Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/platform/tenants"
          className="group rounded-2xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-primary/40 hover:bg-muted/10 flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold group-hover:text-primary transition-colors">
                {t("nav.tenants")}
              </p>
              <p className="text-[11px] text-muted-foreground">{t("quickTenantsHint")}</p>
            </div>
          </div>
          <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors rtl:rotate-90" />
        </Link>

        <Link
          href="/platform/plans"
          className="group rounded-2xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-primary/40 hover:bg-muted/10 flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <span className="grid size-10 place-items-center rounded-xl bg-chart-2/10 text-chart-2">
              <Layers className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold group-hover:text-primary transition-colors">
                {t("nav.plans")}
              </p>
              <p className="text-[11px] text-muted-foreground">{t("quickPlansHint")}</p>
            </div>
          </div>
          <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors rtl:rotate-90" />
        </Link>

        <Link
          href="/platform/audit"
          className="group rounded-2xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-primary/40 hover:bg-muted/10 flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <span className="grid size-10 place-items-center rounded-xl bg-warning/10 text-warning">
              <ShieldAlert className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold group-hover:text-primary transition-colors">
                {t("nav.audit")}
              </p>
              <p className="text-[11px] text-muted-foreground">{t("quickAuditHint")}</p>
            </div>
          </div>
          <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors rtl:rotate-90" />
        </Link>
      </div>

      {/* Recent Workspaces Table */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">{t("nav.workspaces")}</h2>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {dateFormatter.format(new Date())} · {t("overviewNote")}
            </p>
          </div>
          <Link
            href="/platform/tenants"
            className="text-xs text-primary hover:underline font-medium"
          >
            {t("viewAllTenants")}
          </Link>
        </div>

        {recentTenants.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-muted-foreground">{t("empty")}</div>
        ) : (
          <>
            <div className="hidden grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-4 border-b border-border/70 bg-muted/30 px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
              <span>{t("table.tenant")}</span>
              <span>{t("table.status")}</span>
              <span>{t("table.plan")}</span>
              <span>{t("table.created")}</span>
              <span>{t("table.trial")}</span>
            </div>
            <div className="divide-y divide-border/70">
              {recentTenants.map((tenant) => {
                const subscription = tenant.subscriptions[0];
                return (
                  <div
                    key={tenant.id}
                    className="grid gap-2.5 px-5 py-4 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr] md:items-center md:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{tenant.name}</p>
                      <p
                        dir="ltr"
                        className="mt-0.5 truncate font-mono text-[9px] text-muted-foreground"
                      >
                        /{tenant.slug}
                      </p>
                    </div>
                    <div>
                      <Badge variant={statusVariant[tenant.status]} className="text-[9px]">
                        {t(`statuses.${tenant.status}`)}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {localizePlan(subscription?.plan, locale)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {dateFormatter.format(tenant.createdAt)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {tenant.trialEndsAt ? dateFormatter.format(tenant.trialEndsAt) : "—"}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
