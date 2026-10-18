import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowRight,
  Check,
  Clock3,
  Settings2,
  ShieldCheck,
  TicketCheck,
  Users,
  UserRoundCheck,
  Wrench,
} from "lucide-react";

import { AccessDenied } from "@/components/workspace/access-denied";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getTenantAccess, hasTenantPermission } from "@/lib/tenants/context";
import { localizePlan, localizeRole, trialDaysLeft } from "@/lib/tenants/presentation";
import { cn } from "@/lib/utils";

type DashboardPageProps = {
  params: Promise<{ locale: string; tenantSlug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; tenantSlug: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "App.nav" });
  return { title: t("dashboard") };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale, tenantSlug } = await params;
  setRequestLocale(locale);

  const access = await getTenantAccess(locale, tenantSlug);
  if (!hasTenantPermission(access, "analytics:read")) {
    return <AccessDenied tenantSlug={tenantSlug} />;
  }

  const openStatuses = ["OPEN", "IN_PROGRESS", "PENDING_CUSTOMER", "ESCALATED"] as const;
  const [
    ticketCount,
    openTicketCount,
    customerCount,
    memberCount,
    slaTargetCount,
    departmentCount,
    subscription,
  ] = await Promise.all([
    prisma.ticket.count({ where: { tenantId: access.tenant.id } }),
    prisma.ticket.count({
      where: { tenantId: access.tenant.id, status: { in: [...openStatuses] } },
    }),
    prisma.customer.count({ where: { tenantId: access.tenant.id, status: "ACTIVE" } }),
    prisma.membership.count({ where: { tenantId: access.tenant.id, status: "ACTIVE" } }),
    prisma.slaTarget.count({ where: { tenantId: access.tenant.id } }),
    prisma.department.count({ where: { tenantId: access.tenant.id, isActive: true } }),
    prisma.subscription.findFirst({
      where: { tenantId: access.tenant.id },
      orderBy: { createdAt: "desc" },
      select: {
        status: true,
        interval: true,
        trialEnd: true,
        plan: { select: { nameAr: true, nameEn: true } },
      },
    }),
  ]);

  const t = await getTranslations("Dashboard");
  const appT = await getTranslations("App.shell");
  const settingsT = await getTranslations("Settings");
  const number = new Intl.NumberFormat(locale);
  const roleLabel = localizeRole({ key: access.role.key, name: access.role.name }, locale);
  const planName = localizePlan(subscription?.plan, locale);
  const firstName = (access.user.name ?? access.user.email).split(/\s+/)[0] ?? access.user.email;
  const daysLeft =
    access.tenant.status === "TRIALING" ? trialDaysLeft(access.tenant.trialEndsAt) : null;
  const memberSince = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(access.membership.joinedAt ?? access.tenant.createdAt);
  const canTeam = hasTenantPermission(access, "member:read");
  const canSettings = hasTenantPermission(access, "setting:read");

  const stats = [
    {
      label: t("stats.tickets"),
      value: ticketCount,
      hint: t("stats.ticketsHint"),
      icon: TicketCheck,
      tone: "text-primary bg-primary/[0.07] border-primary/15",
    },
    {
      label: t("stats.open"),
      value: openTicketCount,
      hint: t("stats.openHint"),
      icon: Clock3,
      tone: "text-warning-foreground bg-warning/10 border-warning/20 dark:text-warning",
    },
    {
      label: t("stats.customers"),
      value: customerCount,
      hint: t("stats.customersHint"),
      icon: UserRoundCheck,
      tone: "text-chart-2 bg-chart-2/10 border-chart-2/20",
    },
    {
      label: t("stats.team"),
      value: memberCount,
      hint: t("stats.teamHint"),
      icon: Users,
      tone: "text-chart-4 bg-chart-4/10 border-chart-4/20",
    },
  ];

  const setupItems = [
    {
      label: t("setup.workspace"),
      done: true,
      meta: t("setup.workspaceDone"),
      icon: ShieldCheck,
    },
    {
      label: t("setup.sla"),
      done: slaTargetCount > 0,
      meta: slaTargetCount > 0 ? t("setup.slaDone", { count: slaTargetCount }) : t("setup.pending"),
      icon: Clock3,
    },
    {
      label: t("setup.departments"),
      done: departmentCount > 0,
      meta:
        departmentCount > 0
          ? t("setup.departmentsDone", { count: departmentCount })
          : t("setup.pending"),
      icon: Wrench,
    },
    {
      label: t("setup.customers"),
      done: customerCount > 0,
      meta:
        customerCount > 0 ? t("setup.customersDone", { count: customerCount }) : t("setup.pending"),
      icon: Users,
    },
    {
      label: t("setup.team"),
      done: memberCount > 0,
      meta: memberCount > 0 ? t("setup.teamDone", { count: memberCount }) : t("setup.pending"),
      icon: UserRoundCheck,
    },
  ];

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">
            {t("eyebrow", { tenant: access.tenant.name })}
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("title", { name: firstName })}
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {daysLeft !== null ? (
            <Badge variant="warning">{appT("trialDaysLeft", { days: daysLeft })}</Badge>
          ) : subscription?.status ? (
            <Badge variant={subscription.status === "ACTIVE" ? "success" : "secondary"}>
              {settingsT(`subscriptionStatus.${subscription.status}`)}
            </Badge>
          ) : null}
          <Badge variant="outline" className="bg-card">
            <ShieldCheck aria-hidden="true" className="size-3 text-primary" />
            {appT("phase")}
          </Badge>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                {stat.label}
              </p>
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-lg border sm:size-8",
                  stat.tone,
                )}
              >
                <stat.icon aria-hidden="true" className="size-3.5 sm:size-4" strokeWidth={1.9} />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
              {number.format(stat.value)}
            </p>
            <p className="mt-1 text-[9px] leading-4 text-muted-foreground sm:text-[10px]">
              {stat.hint}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">{t("setup.title")}</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">{t("setup.description")}</p>
            </div>
            <Badge variant="outline">
              {number.format(setupItems.filter((item) => item.done).length)}/5
            </Badge>
          </div>
          <div className="mt-5 divide-y divide-border/70 border-y border-border/70">
            {setupItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3 py-3">
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full",
                    item.done ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                  )}
                >
                  {item.done ? (
                    <Check aria-hidden="true" className="size-3.5" strokeWidth={2.8} />
                  ) : (
                    <item.icon aria-hidden="true" className="size-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">{item.label}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{item.meta}</p>
                </div>
                <Badge variant={item.done ? "success" : "secondary"} className="text-[9px]">
                  {item.done ? t("setup.completed") : t("setup.pending")}
                </Badge>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">{t("access.title")}</h2>
          </div>
          <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
            {t("access.description")}
          </p>

          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
              <dt className="text-[11px] text-muted-foreground">{t("access.role")}</dt>
              <dd className="text-xs font-medium">{roleLabel}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
              <dt className="text-[11px] text-muted-foreground">{t("access.permissions")}</dt>
              <dd>
                <Badge variant="outline">{number.format(access.role.permissions.length)}</Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
              <dt className="text-[11px] text-muted-foreground">{t("access.plan")}</dt>
              <dd className="text-xs font-medium">{planName}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
              <dt className="text-[11px] text-muted-foreground">{t("access.memberSince")}</dt>
              <dd className="text-xs font-medium">{memberSince}</dd>
            </div>
          </dl>

          <p className="mt-4 rounded-lg border border-primary/15 bg-primary/[0.035] p-3 text-[10px] leading-5 text-muted-foreground">
            {t("access.phase")}
          </p>
        </section>
      </div>

      {canTeam || canSettings ? (
        <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
          <h2 className="text-sm font-semibold">{t("quickLinks.title")}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {canTeam ? (
              <Link
                href={`/app/${tenantSlug}/team`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/25 hover:bg-accent/40"
              >
                <span className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Users aria-hidden="true" className="size-4" />
                  </span>
                  <span className="text-xs font-medium">{t("quickLinks.team")}</span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                />
              </Link>
            ) : null}
            {canSettings ? (
              <Link
                href={`/app/${tenantSlug}/settings`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/25 hover:bg-accent/40"
              >
                <span className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Settings2 aria-hidden="true" className="size-4" />
                  </span>
                  <span className="text-xs font-medium">{t("quickLinks.settings")}</span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                />
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
