import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Building2, ChevronRight, ShieldCheck } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/session";
import { getInitials } from "@/lib/format";
import { getUserWorkspaces } from "@/lib/tenants/context";
import { localizeRole, trialDaysLeft } from "@/lib/tenants/presentation";

type AppHomePageProps = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "App.chooser" });
  return { title: t("title") };
}

export default async function AppHomePage({ params }: AppHomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const workspaces = await getUserWorkspaces(user.id);
  const t = await getTranslations("App.chooser");
  const shellT = await getTranslations("App.shell");
  const common = await getTranslations("Common");

  if (workspaces.length === 1) {
    redirect(`/${locale}/app/${workspaces[0].tenant.slug}`);
  }

  if (workspaces.length === 0 && user.platformRole === "SUPER_ADMIN") {
    redirect(`/${locale}/platform`);
  }

  return (
    <div className="min-h-dvh bg-muted/20">
      <header className="border-b border-border/60 bg-background">
        <div className="mx-auto flex h-17 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
          <BrandMark />
          <div className="flex items-center gap-1">
            <ThemeToggle compact />
            <LocaleSwitcher compact />
            <div className="mx-1 h-5 w-px bg-border" />
            <div className="hidden items-center gap-2 pe-2 sm:flex">
              <span className="grid size-8 place-items-center rounded-full bg-secondary text-[10px] font-semibold">
                {getInitials(user.name ?? user.email)}
              </span>
              <div>
                <p className="text-xs font-medium">{user.name ?? user.email}</p>
                <p className="text-[10px] text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <SignOutButton locale={locale} label={shellT("signOut")} compact />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="font-mono text-[10px] font-medium tracking-[0.16em] text-primary uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">{t("subtitle")}</p>

        {workspaces.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-8 text-center shadow-xs sm:p-12">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Building2 aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-5 text-lg font-semibold">{t("noWorkspacesTitle")}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted-foreground">
              {t("noWorkspacesDescription")}
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              {common("backHome")}
              <ArrowRight aria-hidden="true" className="size-3.5 rtl:rotate-180" />
            </Link>
          </div>
        ) : (
          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            {workspaces.map((workspace) => {
              const daysLeft = trialDaysLeft(workspace.tenant.trialEndsAt);
              const roleLabel = localizeRole(
                { key: workspace.role.key, name: workspace.role.name },
                locale,
              );
              const isSuspended = workspace.tenant.status === "SUSPENDED";
              return (
                <Link
                  key={workspace.id}
                  href={`/app/${workspace.tenant.slug}`}
                  className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-xs transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-11 place-items-center rounded-xl border border-primary/15 bg-primary/[0.07] text-base font-semibold text-primary">
                      {workspace.tenant.name.charAt(0)}
                    </span>
                    <Badge
                      variant={
                        isSuspended ? "destructive" : daysLeft !== null ? "warning" : "success"
                      }
                    >
                      {isSuspended ? t("suspended") : daysLeft !== null ? t("trial") : t("active")}
                    </Badge>
                  </div>
                  <h2 className="mt-5 text-lg font-semibold">{workspace.tenant.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("role", { role: roleLabel })}
                  </p>
                  {daysLeft !== null ? (
                    <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <ShieldCheck aria-hidden="true" className="size-3.5 text-primary" />
                      {shellT("trialDaysLeft", { days: daysLeft })}
                    </p>
                  ) : null}
                  <span className="mt-5 inline-flex items-center gap-1.5 border-t border-border/70 pt-4 text-xs font-medium text-primary">
                    {t("open")}
                    <ChevronRight
                      aria-hidden="true"
                      className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {user.platformRole === "SUPER_ADMIN" ? (
          <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/[0.04] p-5">
            <Link
              href="/platform"
              className="flex items-center justify-between gap-3 text-sm font-medium text-primary"
            >
              <span className="inline-flex items-center gap-2">
                <ShieldCheck aria-hidden="true" className="size-4" />
                {t("platformConsole")}
              </span>
              <ChevronRight aria-hidden="true" className="size-4 rtl:rotate-180" />
            </Link>
          </div>
        ) : null}
      </main>
    </div>
  );
}
