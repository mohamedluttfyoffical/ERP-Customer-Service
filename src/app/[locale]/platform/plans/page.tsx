import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, Layers } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { PlanStatusToggle } from "@/components/platform/plan-status-toggle";
import { PLAN_FEATURES, type PlanFeatureKey } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Platform.plans" });
  return { title: t("title") };
}

export default async function PlansPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin(locale);

  const t = await getTranslations("Platform.plans");

  const plans = await prisma.plan.findMany({
    orderBy: { tier: "asc" },
    include: {
      prices: true,
      limits: true,
      features: true,
      _count: {
        select: {
          subscriptions: {
            where: { status: "ACTIVE" },
          },
        },
      },
    },
  });

  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Badge variant="outline" className="w-fit">
          <Layers className="size-3 text-primary me-1.5" />
          {t("plansCount", { count: plans.length })}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const monthlyPrice = plan.prices.find((p) => p.interval === "MONTHLY");
          const annualPrice = plan.prices.find((p) => p.interval === "ANNUAL");
          const name = locale === "ar" ? plan.nameAr : plan.nameEn;
          const description = locale === "ar" ? plan.descriptionAr : plan.descriptionEn;

          return (
            <div
              key={plan.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-xs relative overflow-hidden"
            >
              {plan.isPopular ? (
                <div className="absolute top-0 end-0 bg-primary/10 text-primary px-3 py-1 text-[10px] font-semibold rounded-bl-xl">
                  {t("popularBadge")}
                </div>
              ) : null}

              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{name}</h2>
                  <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                    code: {plan.code} · tier: {plan.tier}
                  </p>
                </div>
                <PlanStatusToggle
                  planId={plan.id}
                  planName={name}
                  currentStatus={plan.status}
                />
              </div>

              <p className="mt-2 text-xs leading-5 text-muted-foreground min-h-10">
                {description}
              </p>

              {/* Pricing details */}
              <div className="mt-4 rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t("monthlyPrice")}</span>
                  <span className="font-semibold text-sm">
                    {monthlyPrice ? currencyFormatter.format(Number(monthlyPrice.amount)) : "—"}
                    <span className="text-[10px] font-normal text-muted-foreground">/{t("month")}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t("annualPrice")}</span>
                  <span className="font-semibold text-sm">
                    {annualPrice ? currencyFormatter.format(Number(annualPrice.amount)) : "—"}
                    <span className="text-[10px] font-normal text-muted-foreground">/{t("year")}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-border/50">
                  <span className="text-muted-foreground">{t("activeSubscribers")}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {plan._count.subscriptions}
                  </Badge>
                </div>
              </div>

              {/* Quota Limits */}
              <div className="mt-5 space-y-2 text-xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("limitsTitle")}
                </p>
                <div className="space-y-1.5">
                  {plan.limits.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between py-1 border-b border-border/40 text-[11px]"
                    >
                      <span className="text-muted-foreground">{t(`metric_${l.metric}`)}</span>
                      <span className="font-mono font-medium">
                        {l.limitValue === null ? t("unlimited") : l.limitValue}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Included Features */}
              <div className="mt-5 space-y-2 text-xs flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("featuresTitle")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {plan.features
                    .filter((f) => f.included)
                    .map((f) => {
                      const featureDef = PLAN_FEATURES[f.featureKey as PlanFeatureKey];
                      const featureLabel =
                        locale === "ar"
                          ? featureDef?.nameAr || f.nameAr
                          : featureDef?.nameEn || f.nameEn;

                      return (
                        <span
                          key={f.id}
                          className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[10px] text-secondary-foreground"
                        >
                          <Check className="size-2.5 text-primary" />
                          {featureLabel}
                        </span>
                      );
                    })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
