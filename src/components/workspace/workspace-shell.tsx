"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Building2,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  MessageSquare,
  Settings2,
  ShieldCheck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Link, usePathname } from "@/i18n/navigation";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { NotificationCenter } from "@/components/notifications/notification-center";

type WorkspaceShellProps = {
  children: ReactNode;
  tenant: {
    name: string;
    slug: string;
    trialDaysLeft: number | null;
  };
  user: {
    name: string;
    email: string;
  };
  roleLabel: string;
  planName: string;
  canAccessTeam: boolean;
  canAccessSettings: boolean;
  isPlatformAdmin: boolean;
};

export function WorkspaceShell({
  children,
  tenant,
  user,
  roleLabel,
  planName,
  canAccessTeam,
  canAccessSettings,
  isPlatformAdmin,
}: WorkspaceShellProps) {
  const t = useTranslations("App");
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const base = `/app/${tenant.slug}`;
  const navItems = [
    { href: base, label: t("nav.dashboard"), icon: LayoutDashboard, exact: true },
    { href: `${base}/analytics`, label: t("nav.analytics"), icon: BarChart3, exact: false },
    { href: `${base}/tickets`, label: t("nav.tickets"), icon: LifeBuoy, exact: false },
    { href: `${base}/chat`, label: t("nav.chat"), icon: MessageSquare, exact: false },
    { href: `${base}/kb`, label: t("nav.kb"), icon: BookOpen, exact: false },
    { href: `${base}/crm`, label: t("nav.crm"), icon: Building2, exact: false },
    { href: `${base}/operations`, label: t("nav.operations"), icon: Wrench, exact: false },
    ...(canAccessTeam
      ? [{ href: `${base}/team`, label: t("nav.team"), icon: Users, exact: false }]
      : []),
    ...(canAccessSettings
      ? [
          { href: `${base}/settings`, label: t("nav.settings"), icon: Settings2, exact: true },
          { href: `${base}/settings/billing`, label: t("nav.billing"), icon: CreditCard, exact: false },
        ]
      : []),
  ];

  const matchedNavItem = [...navItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href)));
  const fallbackTitle = pathname.includes("/settings")
    ? t("nav.settings")
    : pathname.includes("/team")
      ? t("nav.team")
      : pathname.includes("/analytics")
        ? t("nav.analytics")
        : pathname.includes("/chat")
          ? t("nav.chat")
          : pathname.includes("/tickets")
            ? t("nav.tickets")
            : pathname.includes("/kb")
              ? t("nav.kb")
              : pathname.includes("/crm")
                ? t("nav.crm")
                : pathname.includes("/operations")
                  ? t("nav.operations")
                  : t("nav.dashboard");
  const headerTitle = matchedNavItem?.label ?? fallbackTitle;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <div className="min-h-dvh bg-muted/20 lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      {mobileOpen ? (
        <button
          type="button"
          aria-label={t("shell.menuClose")}
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-[276px] flex-col border-e border-sidebar-border bg-sidebar transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:w-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link href="/app" aria-label={t("shell.switchWorkspace")}>
            <BrandMark />
          </Link>
          <button
            type="button"
            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label={t("shell.menuClose")}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-3 pt-4">
          <Link
            href="/app"
            className="group flex items-center gap-3 rounded-xl border border-sidebar-border bg-background/70 p-3 transition-colors hover:border-primary/25 hover:bg-background"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-[11px] font-semibold text-primary">
              {tenant.name.charAt(0)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">{tenant.name}</span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">{planName}</span>
            </span>
            <ArrowLeftRight
              aria-hidden="true"
              className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary"
            />
          </Link>
          {tenant.trialDaysLeft !== null ? (
            <div className="mt-2 flex items-center justify-between rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2 text-[10px]">
              <span className="text-muted-foreground">{t("shell.trial")}</span>
              <Badge
                variant="outline"
                className="border-primary/20 bg-background text-[9px] text-primary"
              >
                {t("shell.trialDaysLeft", { days: tenant.trialDaysLeft })}
              </Badge>
            </div>
          ) : null}
        </div>

        <nav className="mt-5 flex-1 space-y-1 overflow-y-auto px-3">
          <p className="mb-2 px-2 font-mono text-[9px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {t("shell.workspace")}
          </p>
          {navItems.map((item) => {
            const isActive =
              item.href === pathname || (!item.exact && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <item.icon
                  aria-hidden="true"
                  className={cn("size-4", isActive ? "text-primary" : "text-muted-foreground")}
                  strokeWidth={1.9}
                />
                {item.label}
              </Link>
            );
          })}

          {isPlatformAdmin ? (
            <>
              <div className="my-3 h-px bg-sidebar-border" />
              <Link
                href="/platform"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              >
                <ShieldCheck
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                  strokeWidth={1.9}
                />
                {t("nav.platform")}
              </Link>
            </>
          ) : null}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
              {getInitials(user.name || user.email)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          <SignOutButton locale={locale} label={t("shell.signOut")} compact />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid size-9 place-items-center rounded-lg border border-border bg-background text-muted-foreground lg:hidden"
              aria-label={t("shell.menuOpen")}
              aria-expanded={mobileOpen}
            >
              <Menu className="size-4" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{headerTitle}</p>
              <p className="hidden truncate text-[10px] text-muted-foreground sm:block">
                {tenant.name} · {roleLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <CommandPalette tenantSlug={tenant.slug} />
            <NotificationCenter tenantSlug={tenant.slug} />
            <div className="hidden items-center gap-1.5 rounded-full border border-border bg-background px-2 py-1 md:flex">
              <span className="size-1.5 rounded-full bg-success" />
              <span className="text-[10px] font-medium text-muted-foreground">{planName}</span>
            </div>
            <ThemeToggle compact />
            <LocaleSwitcher compact />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
