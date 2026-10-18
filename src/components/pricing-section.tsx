"use client";

import { useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type PricingPlanView = {
  code: string;
  name: string;
  description: string;
  monthlyAmount: number;
  annualAmount: number;
  annualDiscountPercent: string;
  features: { key: string; name: string; description: string }[];
  limits: {
    agents: number | null;
    tickets: number | null;
    storageMb: number | null;
    departments: number | null;
  };
  isPopular: boolean;
};

function formatPrice(amount: number, locale: string): string {
  return new Intl.NumberFormat(`${locale}-u-nu-latn`, {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function PricingSection({ plans }: { plans: PricingPlanView[] }) {
  const t = useTranslations("Pricing");
  const common = useTranslations("Common");
  const locale = useLocale();
  const [interval, setInterval] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");

  return (
    <section id="pricing" className="scroll-mt-24 border-t border-border/60 bg-card/30">
      <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
            {t("eyebrow")}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-sm leading-7 text-balance text-muted-foreground sm:text-base">
            {t("description")}
          </p>
        </div>

        <div className="mt-9 flex flex-col items-center gap-3">
          <div
            role="group"
            aria-label={t("monthly") + " / " + t("annual")}
            className="inline-flex items-center rounded-full border border-border bg-background p-1 shadow-xs"
          >
            <button
              type="button"
              aria-pressed={interval === "MONTHLY"}
              onClick={() => setInterval("MONTHLY")}
              className={cn(
                "rounded-full px-5 py-2 text-xs font-semibold transition-colors",
                interval === "MONTHLY"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("monthly")}
            </button>
            <button
              type="button"
              aria-pressed={interval === "ANNUAL"}
              onClick={() => setInterval("ANNUAL")}
              className={cn(
                "rounded-full px-5 py-2 text-xs font-semibold transition-colors",
                interval === "ANNUAL"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("annual")}
            </button>
          </div>
          <Badge variant="success" className="gap-1.5">
            <span className="size-1.5 rounded-full bg-success" />
            {t("annualBadge")} · 16.67%
          </Badge>
        </div>

        <div className="mt-10 grid items-start gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const isAnnual = interval === "ANNUAL";
            const displayAmount = isAnnual ? plan.annualAmount : plan.monthlyAmount;
            const monthlyEquivalent = isAnnual ? plan.annualAmount / 12 : plan.monthlyAmount;
            const shownFeatures = plan.features.slice(0, 7);
            const hiddenFeatureCount = plan.features.length - shownFeatures.length;

            return (
              <article
                key={plan.code}
                className={cn(
                  "relative flex h-full flex-col rounded-3xl border bg-card p-6 shadow-xs transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:p-7",
                  plan.isPopular
                    ? "border-primary/35 shadow-md ring-1 shadow-primary/5 ring-primary/10"
                    : "border-border hover:border-primary/20",
                )}
              >
                {plan.isPopular ? (
                  <Badge className="absolute start-6 -top-3 border-primary/20 bg-primary text-primary-foreground">
                    {t("popular")}
                  </Badge>
                ) : null}

                <div className="min-h-[106px]">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                    {plan.description}
                  </p>
                </div>

                <div className="mt-4 border-y border-border/70 py-5">
                  <div className="flex items-end gap-1.5">
                    <span dir="ltr" className="text-4xl font-semibold tracking-tight tabular-nums">
                      {formatPrice(displayAmount, locale)}
                    </span>
                    <span className="pb-1 text-xs text-muted-foreground">
                      {isAnnual ? t("perYear") : t("perMonth")}
                    </span>
                  </div>
                  <p className="mt-2 min-h-5 text-[11px] text-muted-foreground">
                    {isAnnual
                      ? t("equivalentPerMonth", {
                          amount: formatPrice(monthlyEquivalent, locale),
                        })
                      : t("billedAnnually") + ": " + formatPrice(plan.annualAmount, locale)}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
                  <span>
                    <strong className="font-semibold text-foreground">
                      {plan.limits.agents === null
                        ? common("unlimited")
                        : new Intl.NumberFormat(`${locale}-u-nu-latn`).format(plan.limits.agents)}
                    </strong>{" "}
                    {t("limits.agents")}
                  </span>
                  <span>
                    <strong className="font-semibold text-foreground">
                      {plan.limits.tickets === null
                        ? common("unlimited")
                        : new Intl.NumberFormat(`${locale}-u-nu-latn`).format(plan.limits.tickets)}
                    </strong>{" "}
                    {t("limits.tickets")}
                  </span>
                  <span>
                    <strong className="font-semibold text-foreground">
                      {plan.limits.storageMb === null
                        ? common("unlimited")
                        : t("storageValue", { value: plan.limits.storageMb / 1024 })}
                    </strong>{" "}
                    {t("limits.storage")}
                  </span>
                  <span>
                    <strong className="font-semibold text-foreground">
                      {plan.limits.departments === null
                        ? common("unlimited")
                        : new Intl.NumberFormat(`${locale}-u-nu-latn`).format(
                            plan.limits.departments,
                          )}
                    </strong>{" "}
                    {t("limits.departments")}
                  </span>
                </div>

                <div className="mt-6 flex-1">
                  <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    {t("includes")}
                  </p>
                  <ul className="mt-3 space-y-2.5">
                    {shownFeatures.map((feature) => (
                      <li key={feature.key} className="flex items-start gap-2.5 text-[12px]">
                        <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                          <Check aria-hidden="true" className="size-2.5" strokeWidth={3} />
                        </span>
                        <span className="leading-5 text-muted-foreground">{feature.name}</span>
                      </li>
                    ))}
                  </ul>
                  {hiddenFeatureCount > 0 ? (
                    <p className="mt-3 text-[11px] font-medium text-muted-foreground">
                      {t("moreFeatures", { count: hiddenFeatureCount })}
                    </p>
                  ) : null}
                </div>

                <Link
                  href={{
                    pathname: "/register",
                    query: { plan: plan.code, interval },
                  }}
                  className={cn(
                    "mt-7 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors",
                    plan.isPopular
                      ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                      : "border border-border bg-background text-foreground hover:border-primary/30 hover:bg-accent",
                  )}
                >
                  {t("startTrial")}
                  <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </Link>
                <p className="mt-3 text-center text-[10px] text-muted-foreground">
                  {t("freeTrial")} · {t("noCard")}
                </p>
              </article>
            );
          })}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-[11px] leading-5 text-muted-foreground">
          {t("footnote")}
        </p>
      </div>
    </section>
  );
}
