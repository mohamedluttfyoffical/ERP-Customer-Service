import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Gauge,
  HelpCircle,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { AccessDenied } from "@/components/workspace/access-denied";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getTenantAccess, hasTenantPermission } from "@/lib/tenants/context";
import { localizePlan, trialDaysLeft } from "@/lib/tenants/presentation";
import { getTenantUsageSummary } from "@/lib/billing/gating";
import { CustomerPortalButton, PlanUpgradeGrid } from "@/components/workspace/billing-actions";
import { type SubscriptionInvoiceStatus } from "@prisma/client";

type BillingPageProps = {
  params: Promise<{ locale: string; tenantSlug: string }>;
  searchParams: Promise<{ billing_status?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; tenantSlug: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Settings.billing" });
  return { title: t("title") };
}

const invoiceStatusVariant: Record<
  SubscriptionInvoiceStatus,
  "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
> = {
  PAID: "success",
  OPEN: "warning",
  DRAFT: "secondary",
  VOID: "secondary",
  UNCOLLECTIBLE: "destructive",
};

export default async function BillingPage({ params, searchParams }: BillingPageProps) {
  const { locale, tenantSlug } = await params;
  const { billing_status } = await searchParams;
  setRequestLocale(locale);

  const access = await getTenantAccess(locale, tenantSlug);
  if (!hasTenantPermission(access, "setting:read")) {
    return <AccessDenied tenantSlug={tenantSlug} />;
  }

  const [usageSummary, invoices, t, settingsT] = await Promise.all([
    getTenantUsageSummary(access.tenant.id),
    prisma.subscriptionInvoice.findMany({
      where: { tenantId: access.tenant.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getTranslations("Settings.billing"),
    getTranslations("Settings"),
  ]);

  const subscription = await prisma.subscription.findFirst({
    where: { tenantId: access.tenant.id },
    orderBy: { createdAt: "desc" },
    include: {
      plan: true,
      planPrice: true,
    },
  });

  const planName = localizePlan(subscription?.plan, locale);
  const daysLeft =
    access.tenant.status === "TRIALING" ? trialDaysLeft(access.tenant.trialEndsAt) : null;
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
  });

  const metricsList = [
    { key: "AGENTS", icon: Users, label: t("metricAgents") },
    { key: "TICKETS_PER_MONTH", icon: FileText, label: t("metricTickets") },
    { key: "STORAGE_MB", icon: Gauge, label: t("metricStorage") },
    { key: "DEPARTMENTS", icon: ShieldCheck, label: t("metricDepartments") },
    { key: "KNOWLEDGE_BASE_ARTICLES", icon: HelpCircle, label: t("metricArticles") },
    { key: "MONTHLY_ACTIVE_CUSTOMERS", icon: Users, label: t("metricCustomers") },
  ] as const;

  return (
    <div className="space-y-7">
      {/* Back button and page title */}
      <div>
        <Link
          href={`/app/${tenantSlug}/settings`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="size-3.5 rtl:rotate-180" />
          {t("backToSettings")}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
          </div>
          <CustomerPortalButton tenantSlug={tenantSlug} />
        </div>
      </div>

      {billing_status === "success" ? (
        <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4 text-xs text-success-foreground">
          <CheckCircle2 className="size-5 text-success shrink-0" />
          <div>
            <p className="font-semibold">{t("paymentSuccessTitle")}</p>
            <p className="text-[11px] text-muted-foreground">{t("paymentSuccessDesc")}</p>
          </div>
        </div>
      ) : null}

      {/* Current Plan Overview Card */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <CreditCard className="size-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{planName}</h2>
                <Badge
                  variant={
                    subscription?.status === "ACTIVE"
                      ? "success"
                      : subscription?.status === "TRIALING"
                        ? "warning"
                        : "destructive"
                  }
                  className="text-[10px]"
                >
                  {subscription ? settingsT(`subscriptionStatus.${subscription.status}`) : "—"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {subscription?.interval === "ANNUAL" ? t("billedAnnual") : t("billedMonthly")} ·{" "}
                {subscription?.currentPeriodEnd
                  ? t("renewsOn", { date: dateFormatter.format(subscription.currentPeriodEnd) })
                  : daysLeft !== null
                    ? t("trialDaysLeft", { days: daysLeft })
                    : "—"}
              </p>
            </div>
          </div>

          <div className="text-start sm:text-end">
            <p className="text-xs text-muted-foreground">{t("currentCommitment")}</p>
            <p className="text-2xl font-bold tracking-tight">
              {subscription?.unitAmount
                ? currencyFormatter.format(Number(subscription.unitAmount))
                : "—"}
              <span className="text-xs font-normal text-muted-foreground ms-1">
                /{subscription?.interval === "ANNUAL" ? t("year") : t("month")}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Plan Quotas & Usage Progress */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">{t("usageTitle")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{t("usageSubtitle")}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {t("liveTracking")}
          </Badge>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {metricsList.map((m) => {
            const usage = usageSummary.metrics[m.key];
            const isUnlimited = usage?.limit === null;
            const percentage = usage ? usage.percentage : 0;
            const isNearLimit = percentage >= 80 && !isUnlimited;

            return (
              <div
                key={m.key}
                className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <m.icon className="size-4 text-primary" />
                    <span className="font-medium">{m.label}</span>
                  </div>
                  <span className="font-mono text-[11px] font-semibold">
                    {usage?.current ?? 0} / {isUnlimited ? "∞" : usage?.limit}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isNearLimit ? "bg-destructive" : "bg-primary"
                    }`}
                    style={{ width: `${isUnlimited ? Math.min(100, (usage?.current ?? 0) * 10) : percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{isUnlimited ? t("unlimitedMetric") : `${percentage}% ${t("used")}`}</span>
                  {!isUnlimited && usage?.remaining !== null ? (
                    <span>{t("remaining", { count: usage.remaining })}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Plan Upgrade Selector */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="size-4" />
            {t("changePlanTitle")}
          </div>
          <h3 className="text-lg font-bold">{t("selectSuitablePlan")}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t("changePlanSubtitle")}</p>
        </div>

        <PlanUpgradeGrid
          tenantSlug={tenantSlug}
          currentPlanCode={subscription?.plan.code ?? "STARTER"}
          currentInterval={subscription?.interval ?? "MONTHLY"}
        />
      </section>

      {/* Invoices History Table */}
      <section className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">{t("invoicesTitle")}</h3>
          </div>
          <Badge variant="outline">{invoices.length}</Badge>
        </div>

        {invoices.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">{t("noInvoices")}</div>
        ) : (
          <div className="divide-y divide-border/70">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 px-5 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <FileText className="size-4" />
                  </span>
                  <div>
                    <p className="font-mono font-semibold">{inv.number}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {dateFormatter.format(inv.periodStart)} – {dateFormatter.format(inv.periodEnd)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 justify-between sm:justify-end">
                  <span className="font-bold text-sm">
                    {currencyFormatter.format(Number(inv.total))}
                  </span>
                  <Badge variant={invoiceStatusVariant[inv.status]} className="text-[10px]">
                    {t(`invoiceStatus_${inv.status}`)}
                  </Badge>
                  {inv.pdfUrl || inv.hostedInvoiceUrl ? (
                    <a
                      href={inv.pdfUrl || inv.hostedInvoiceUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1 text-[11px]"
                    >
                      <Download className="size-3" />
                      {t("download")}
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
