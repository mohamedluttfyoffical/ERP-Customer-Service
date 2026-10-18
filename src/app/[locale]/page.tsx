import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Check,
  ChevronDown,
  Clock3,
  Database,
  Gauge,
  Globe2,
  LockKeyhole,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Users,
  Wrench,
} from "lucide-react";

import { auth } from "@/auth";
import { ProductPreview } from "@/components/landing/product-preview";
import { PricingSection, type PricingPlanView } from "@/components/pricing-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { PLAN_CATALOG, PLAN_FEATURES } from "@/lib/plans";
import { cn } from "@/lib/utils";

type LandingPageProps = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LandingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return { title: t("title"), description: t("description") };
}

export default async function LandingPage({ params }: LandingPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [session, t, featureT, workflowT, faqT] = await Promise.all([
    auth(),
    getTranslations("Landing"),
    getTranslations("Landing.features.items"),
    getTranslations("Landing.workflow.steps"),
    getTranslations("Landing.faq.items"),
  ]);

  const plans: PricingPlanView[] = PLAN_CATALOG.map((plan) => ({
    code: plan.code,
    name: locale === "ar" ? plan.nameAr : plan.nameEn,
    description: locale === "ar" ? plan.descriptionAr : plan.descriptionEn,
    monthlyAmount: Number(plan.prices.MONTHLY),
    annualAmount: Number(plan.prices.ANNUAL),
    annualDiscountPercent: plan.annualDiscountPercent,
    features: plan.features.map((featureKey) => {
      const feature = PLAN_FEATURES[featureKey];
      return {
        key: featureKey,
        name: locale === "ar" ? feature.nameAr : feature.nameEn,
        description: feature.description,
      };
    }),
    limits: {
      agents: plan.limits.AGENTS,
      tickets: plan.limits.TICKETS_PER_MONTH,
      storageMb: plan.limits.STORAGE_MB,
      departments: plan.limits.DEPARTMENTS,
    },
    isPopular: plan.isPopular,
  }));

  const features = [
    { icon: Users, key: "context" },
    { icon: Clock3, key: "sla" },
    { icon: Wrench, key: "operations" },
    { icon: MessageSquareText, key: "collaboration" },
    { icon: Globe2, key: "bilingual" },
    { icon: LockKeyhole, key: "security" },
  ] as const;

  const workflow = [
    { icon: TicketCheck, key: "one" },
    { icon: Database, key: "two" },
    { icon: Wrench, key: "three" },
    { icon: Gauge, key: "four" },
  ] as const;

  const faqKeys = ["trial", "lang", "isolation", "roles", "data"] as const;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader isAuthenticated={Boolean(session?.user)} />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/60">
          <div
            aria-hidden="true"
            className="surface-grid pointer-events-none absolute inset-0 opacity-50"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute start-1/2 -top-44 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
          />
          <div className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-5 pt-16 pb-20 sm:px-8 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pt-28 lg:pb-28">
            <div className="max-w-2xl">
              <Badge
                variant="outline"
                className="gap-2 border-primary/20 bg-primary/[0.04] px-3 py-1.5 text-primary"
              >
                <Sparkles aria-hidden="true" className="size-3.5" />
                {t("hero.badge")}
              </Badge>
              <h1 className="mt-6 text-[2.75rem] leading-[1.16] font-semibold tracking-[-0.045em] text-balance sm:text-6xl sm:leading-[1.08] lg:text-[4.15rem]">
                {t("hero.titleLine1")}
                <span className="block text-primary">{t("hero.titleLine2")}</span>
              </h1>
              <p className="mt-6 max-w-xl text-[15px] leading-8 text-balance text-muted-foreground sm:text-lg">
                {t("hero.description")}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className={cn(buttonVariants({ size: "lg" }), "group h-11 px-6 text-sm")}
                >
                  {t("hero.primaryCta")}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                  />
                </Link>
                <a
                  href="#pricing"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-11 px-6 text-sm",
                  )}
                >
                  {t("hero.secondaryCta")}
                </a>
              </div>
              <p className="mt-4 text-[11px] text-muted-foreground">{t("hero.note")}</p>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2.5 border-t border-border/70 pt-5">
                {[t("hero.proofOne"), t("hero.proofTwo"), t("hero.proofThree")].map((proof) => (
                  <span
                    key={proof}
                    className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
                  >
                    <Check aria-hidden="true" className="size-3 text-success" strokeWidth={2.6} />
                    {proof}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative lg:ps-3">
              <ProductPreview />
            </div>
          </div>
        </section>

        <section className="border-b border-border/60 bg-card/30">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-border/60 px-5 sm:px-8 lg:grid-cols-4 rtl:divide-x-reverse">
            {[
              { icon: LockKeyhole, label: t("capabilities.tenantIsolation") },
              { icon: Globe2, label: t("capabilities.bilingual") },
              { icon: ShieldCheck, label: t("capabilities.rbac") },
              { icon: Clock3, label: t("capabilities.sla") },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-center gap-2.5 px-3 py-5">
                <item.icon aria-hidden="true" className="size-3.5 text-primary" />
                <span className="text-[11px] font-medium text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="scroll-mt-24 border-b border-border/60">
          <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
                {t("features.eyebrow")}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                {t("features.title")}
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                {t("features.description")}
              </p>
            </div>

            <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <article
                  key={feature.key}
                  className="group relative bg-card p-6 transition-colors hover:bg-accent/30 sm:p-7"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl border border-primary/15 bg-primary/[0.06] text-primary">
                      <feature.icon aria-hidden="true" className="size-4.5" strokeWidth={1.9} />
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/60">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-[15px] font-semibold">
                    {featureT(`${feature.key}.title`)}
                  </h3>
                  <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                    {featureT(`${feature.key}.description`)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-24 border-b border-border/60 bg-card/30">
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
                {t("workflow.eyebrow")}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                {t("workflow.title")}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
                {t("workflow.description")}
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {["tickets", "SLA", "CRM", "work orders", "invoices", "knowledge"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-border bg-background px-2.5 py-1 font-mono text-[10px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute start-[19px] top-5 bottom-5 w-px bg-gradient-to-b from-primary/50 via-border to-transparent"
              />
              <div className="space-y-4">
                {workflow.map((step, index) => (
                  <article
                    key={step.key}
                    className="relative flex gap-5 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
                  >
                    <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full border border-primary/20 bg-background text-primary shadow-xs">
                      <step.icon aria-hidden="true" className="size-4" strokeWidth={1.9} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          0{index + 1}
                        </span>
                        <h3 className="text-sm font-semibold">{workflowT(`${step.key}.title`)}</h3>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
                        {workflowT(`${step.key}.description`)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/[0.045] p-5">
                <Boxes aria-hidden="true" className="size-5 shrink-0 text-primary" />
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  <span>Asset</span>
                  <ArrowRight aria-hidden="true" className="size-3 rtl:rotate-180" />
                  <span>Work order</span>
                  <ArrowRight aria-hidden="true" className="size-3 rtl:rotate-180" />
                  <span className="inline-flex items-center gap-1">
                    <ReceiptText className="size-3" />
                    Invoice
                  </span>
                  <span className="text-primary">· linked to ticket #1042</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PricingSection plans={plans} />

        <section id="faq" className="scroll-mt-24 border-t border-border/60">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
            <div>
              <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
                {t("faq.eyebrow")}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                {t("faq.title")}
              </h2>
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-success" />
                tenantId · RBAC · Audit
              </div>
            </div>
            <div className="divide-y divide-border/70 border-y border-border/70">
              {faqKeys.map((key) => (
                <details key={key} className="group py-1.5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 rounded-lg px-1 py-4 text-sm font-medium transition-colors outline-none hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/30 [&::-webkit-details-marker]:hidden">
                    <span>{faqT(`${key}.question`)}</span>
                    <ChevronDown
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                    />
                  </summary>
                  <p className="px-1 pb-5 text-[13px] leading-7 text-muted-foreground">
                    {faqT(`${key}.answer`)}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/60">
          <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-primary px-6 py-12 text-primary-foreground shadow-xl shadow-primary/15 sm:px-12 sm:py-14">
              <div
                aria-hidden="true"
                className="absolute -end-24 -top-28 size-72 rounded-full border border-white/15"
              />
              <div
                aria-hidden="true"
                className="absolute -start-20 -bottom-40 size-80 rounded-full border border-white/10"
              />
              <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-center">
                <div className="max-w-xl">
                  <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary-foreground/70 uppercase">
                    {t("cta.eyebrow")}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                    {t("cta.title")}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-primary-foreground/75">
                    {t("cta.description")}
                  </p>
                </div>
                <Link
                  href="/register"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "lg" }),
                    "h-11 shrink-0 border-transparent bg-background px-6 text-foreground hover:bg-background/90",
                  )}
                >
                  {t("cta.button")}
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
