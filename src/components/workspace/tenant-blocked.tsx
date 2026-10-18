import { getTranslations } from "next-intl/server";
import { LifeBuoy, ShieldAlert } from "lucide-react";
import type { TenantStatus } from "@prisma/client";

import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { APP_CONFIG } from "@/lib/config";

export async function TenantBlocked({ status, locale }: { status: TenantStatus; locale: string }) {
  const t = await getTranslations("App.blocked");
  const isCanceled = status === "CANCELED";
  const isProvisioning = status === "PROVISIONING";
  const title = isCanceled
    ? t("canceledTitle")
    : isProvisioning
      ? t("provisioningTitle")
      : t("suspendedTitle");
  const description = isCanceled
    ? t("canceledDescription")
    : isProvisioning
      ? t("provisioningDescription")
      : t("suspendedDescription");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-17 items-center justify-between px-5 sm:px-8">
        <BrandMark />
        <div className="flex items-center gap-1">
          <ThemeToggle compact />
          <LocaleSwitcher compact />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-10">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-destructive/15 bg-destructive/[0.06] text-destructive">
            <ShieldAlert aria-hidden="true" className="size-6" strokeWidth={1.8} />
          </span>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <a
              href={`mailto:${APP_CONFIG.supportEmail}`}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              <LifeBuoy aria-hidden="true" className="size-4" />
              {t("contact")}
            </a>
            <SignOutButton locale={locale} label={t("signOut")} />
          </div>
        </div>
      </main>
    </div>
  );
}
