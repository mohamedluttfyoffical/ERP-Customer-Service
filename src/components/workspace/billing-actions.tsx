"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  createCheckoutSessionAction,
  createCustomerPortalSessionAction,
  upgradeTenantPlanDirectAction,
} from "@/lib/billing/actions";
import { PLAN_CATALOG, type PlanCode } from "@/lib/plans";
import { type BillingInterval } from "@prisma/client";

interface CustomerPortalButtonProps {
  tenantSlug: string;
}

export function CustomerPortalButton({ tenantSlug }: CustomerPortalButtonProps) {
  const t = useTranslations("Settings.billing");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const handleOpenPortal = () => {
    startTransition(async () => {
      const res = await createCustomerPortalSessionAction({ tenantSlug, locale });
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        toast.error(!res.success ? res.error : t("portalError"));
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={handleOpenPortal}
      className="text-xs gap-1.5"
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <ExternalLink className="size-3.5" />
      )}
      {t("managePaymentMethod")}
    </Button>
  );
}

interface PlanUpgradeGridProps {
  tenantSlug: string;
  currentPlanCode: string;
  currentInterval: BillingInterval;
}

export function PlanUpgradeGrid({
  tenantSlug,
  currentPlanCode,
  currentInterval: initialInterval,
}: PlanUpgradeGridProps) {
  const t = useTranslations("Settings.billing");
  const locale = useLocale();
  const [interval, setInterval] = useState<BillingInterval>(initialInterval);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSelectPlan = (planCode: PlanCode) => {
    setPendingPlan(planCode);
    startTransition(async () => {
      // First try checkout session
      const res = await createCheckoutSessionAction({
        tenantSlug,
        planCode,
        interval,
        locale,
      });

      if (res.success && res.url) {
        // If checkout URL is returned, navigate to Stripe (or simulated callback)
        window.location.href = res.url;
      } else {
        // If Stripe is unconfigured, fallback to direct manual upgrade for development
        const directRes = await upgradeTenantPlanDirectAction({
          tenantSlug,
          planCode,
          interval,
          locale,
        });

        if (directRes.success) {
          toast.success(t("upgradeSuccess"));
        } else {
          toast.error(directRes.error || t("upgradeError"));
        }
      }
      setPendingPlan(null);
    });
  };

  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  return (
    <div className="space-y-5">
      {/* Interval Toggle */}
      <div className="flex items-center justify-center">
        <div className="flex items-center rounded-xl border border-border bg-card p-1 text-xs">
          <button
            type="button"
            onClick={() => setInterval("MONTHLY")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              interval === "MONTHLY"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("monthly")}
          </button>
          <button
            type="button"
            onClick={() => setInterval("ANNUAL")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors flex items-center gap-1.5 ${
              interval === "ANNUAL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("annual")}
            <Badge variant="warning" className="text-[9px] px-1 py-0 h-4">
              {t("save20")}
            </Badge>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_CATALOG.map((plan) => {
          const isCurrent = plan.code === currentPlanCode && interval === initialInterval;
          const isThisPlanSelected = pendingPlan === plan.code && isPending;
          const price = Number(plan.prices[interval]);
          const name = locale === "ar" ? plan.nameAr : plan.nameEn;
          const desc = locale === "ar" ? plan.descriptionAr : plan.descriptionEn;

          return (
            <div
              key={plan.code}
              className={`flex flex-col rounded-2xl border p-5 transition-all ${
                plan.isPopular
                  ? "border-primary/50 bg-primary/[0.02] shadow-xs"
                  : "border-border bg-card"
              }`}
            >
              {plan.isPopular ? (
                <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold text-primary">
                  <Sparkles className="size-3" />
                  {t("recommended")}
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold">{name}</h3>
                {isCurrent ? (
                  <Badge variant="outline" className="text-[10px] bg-background">
                    {t("currentPlanBadge")}
                  </Badge>
                ) : null}
              </div>

              <p className="mt-1 text-xs text-muted-foreground leading-5 min-h-10">{desc}</p>

              <div className="mt-4 mb-5">
                <span className="text-2xl font-bold tracking-tight">
                  {currencyFormatter.format(price)}
                </span>
                <span className="text-xs text-muted-foreground ms-1">
                  /{interval === "ANNUAL" ? t("year") : t("month")}
                </span>
              </div>

              <div className="mt-auto">
                <Button
                  className="w-full text-xs font-semibold"
                  variant={isCurrent ? "outline" : plan.isPopular ? "default" : "secondary"}
                  disabled={isCurrent || isPending}
                  onClick={() => handleSelectPlan(plan.code)}
                >
                  {isThisPlanSelected ? (
                    <Loader2 className="size-3.5 animate-spin me-1.5" />
                  ) : null}
                  {isCurrent ? t("activePlan") : t("selectPlan")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
