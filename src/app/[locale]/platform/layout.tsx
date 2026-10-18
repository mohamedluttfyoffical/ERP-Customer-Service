import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { PlatformNav } from "@/components/platform/platform-nav";
import { Link } from "@/i18n/navigation";
import { requireSuperAdmin } from "@/lib/auth/session";
import { getInitials } from "@/lib/format";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type PlatformLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function PlatformLayout({ children, params }: PlatformLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireSuperAdmin(locale);
  const t = await getTranslations("Platform");
  const common = await getTranslations("Common");
  const shellT = await getTranslations("App.shell");

  return (
    <div className="min-h-dvh bg-muted/20">
      <header className="border-b border-border/60 bg-background">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex items-center gap-4">
            <Link href="/platform" aria-label={t("title")}>
              <BrandMark />
            </Link>
            <div className="hidden h-5 w-px bg-border sm:block" />
            <Badge variant="outline" className="hidden bg-card sm:inline-flex">
              <ShieldCheck aria-hidden="true" className="size-3 text-primary" />
              {t("platformBadge")}
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
            >
              <ArrowLeft aria-hidden="true" className="size-3.5 rtl:rotate-180" />
              {common("backHome")}
            </Link>
            <div className="mx-1 h-5 w-px bg-border" />
            <ThemeToggle compact />
            <LocaleSwitcher compact />
            <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
            <div className="hidden items-center gap-2 pe-1 sm:flex">
              <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {getInitials(user.name ?? user.email)}
              </span>
              <div className="max-w-36">
                <p className="truncate text-[11px] font-medium">{user.name}</p>
                <p className="truncate text-[9px] text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <SignOutButton locale={locale} label={shellT("signOut")} compact />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 sm:py-8">
        <PlatformNav />
        {children}
      </main>
    </div>
  );
}
