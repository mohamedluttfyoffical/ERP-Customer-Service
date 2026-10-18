import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Building2, CreditCard, Globe2, ShieldCheck } from "lucide-react";

import { AccessDenied } from "@/components/workspace/access-denied";
import { ProfileForm } from "@/components/workspace/profile-form";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { getTenantAccess, hasTenantPermission } from "@/lib/tenants/context";
import { localizePlan, trialDaysLeft } from "@/lib/tenants/presentation";
import { Link } from "@/i18n/navigation";

type SettingsPageProps = {
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
  return { title: t("settings") };
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale, tenantSlug } = await params;
  setRequestLocale(locale);

  const access = await getTenantAccess(locale, tenantSlug);
  if (!hasTenantPermission(access, "setting:read")) {
    return <AccessDenied tenantSlug={tenantSlug} />;
  }

  const [settings, subscription, t] = await Promise.all([
    prisma.tenantSetting.findUnique({ where: { tenantId: access.tenant.id } }),
    prisma.subscription.findFirst({
      where: { tenantId: access.tenant.id },
      orderBy: { createdAt: "desc" },
      select: {
        status: true,
        interval: true,
        trialEnd: true,
        currentPeriodEnd: true,
        plan: { select: { nameAr: true, nameEn: true, tier: true } },
      },
    }),
    getTranslations("Settings"),
  ]);

  const canManage = hasTenantPermission(access, "setting:manage");
  const daysLeft =
    access.tenant.status === "TRIALING" ? trialDaysLeft(access.tenant.trialEndsAt) : null;
  const planName = localizePlan(subscription?.plan, locale);
  const tenantStatusT = await getTranslations("Platform.statuses");
  const shellT = await getTranslations("App.shell");
  const formatDate = (value: Date | null) =>
    value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(value) : "—";
  const defaultLocaleLabel =
    access.tenant.defaultLocale === "AR" ? "العربية (RTL)" : "English (LTR)";

  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground">{t("eyebrow")}</p>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-7 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Building2 aria-hidden="true" className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">{t("profileTitle")}</h2>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                {t("profileDescription")}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <ProfileForm
              tenantSlug={access.tenant.slug}
              initialValues={{
                name: access.tenant.name,
                supportEmail: settings?.supportEmail ?? "",
                supportPhone: settings?.supportPhone ?? "",
              }}
              canManage={canManage}
            />
          </div>

          <dl className="mt-6 grid gap-4 border-t border-border/70 pt-5 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-medium text-muted-foreground">{t("slug")}</dt>
              <dd dir="ltr" className="mt-1 font-mono text-[11px]">
                /{locale}/app/{access.tenant.slug}
              </dd>
              <p className="mt-1 text-[9px] leading-4 text-muted-foreground">{t("slugNote")}</p>
            </div>
            <div>
              <dt className="text-[10px] font-medium text-muted-foreground">{t("timezone")}</dt>
              <dd className="mt-1 text-[11px]">{access.tenant.timezone}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium text-muted-foreground">
                {t("defaultLocale")}
              </dt>
              <dd className="mt-1 text-[11px]">{defaultLocaleLabel}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium text-muted-foreground">{t("status")}</dt>
              <dd className="mt-1 inline-flex items-center gap-1.5 text-[11px]">
                <span className="size-1.5 rounded-full bg-success" />
                {tenantStatusT(access.tenant.status)}
              </dd>
            </div>
          </dl>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
            <div className="flex items-center gap-2">
              <CreditCard aria-hidden="true" className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">{t("planTitle")}</h2>
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
              {t("planDescription")}
            </p>

            <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
              <p className="text-[10px] text-muted-foreground">{t("plan")}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-lg font-semibold">{planName}</p>
                <Badge variant="outline" className="bg-background">
                  {subscription?.interval === "ANNUAL" ? t("annual") : t("monthly")}
                </Badge>
              </div>
              <dl className="mt-4 space-y-2.5 border-t border-primary/10 pt-3 text-[11px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t("status")}</dt>
                  <dd className="font-medium">
                    {subscription ? t(`subscriptionStatus.${subscription.status}`) : "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t("trialEnds")}</dt>
                  <dd className="font-medium">
                    {formatDate(subscription?.trialEnd ?? access.tenant.trialEndsAt)}
                  </dd>
                </div>
                {daysLeft !== null ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">
                      {shellT("trialDaysLeft", { days: daysLeft })}
                    </dt>
                    <dd>
                      <Badge variant="warning" className="text-[9px]">
                        {t("subscriptionStatus.TRIALING")}
                      </Badge>
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t("interval")}</dt>
                  <dd className="font-medium">
                    {subscription?.interval === "ANNUAL" ? t("annual") : t("monthly")}
                  </dd>
                </div>
              </dl>
              <Link
                href={`/app/${access.tenant.slug}/settings/billing`}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-opacity hover:opacity-90"
              >
                <CreditCard className="size-3.5" />
                {t("manageBilling")}
              </Link>
            </div>
            <p className="mt-3 text-[10px] leading-5 text-muted-foreground">{t("billingNote")}</p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck aria-hidden="true" className="size-3.5 text-success" />
              tenantId · <span className="font-mono">{access.tenant.id.slice(0, 12)}…</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Globe2 aria-hidden="true" className="size-3.5 text-primary" />
              {defaultLocaleLabel} · {access.tenant.timezone}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
