"use client";

import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const sectionLinks = [
  { href: "#features", key: "features" },
  { href: "#workflow", key: "workflow" },
  { href: "#pricing", key: "pricing" },
  { href: "#faq", key: "faq" },
] as const;

export function SiteHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  const t = useTranslations("Nav");
  const common = useTranslations("Common");
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="Sanad">
            <BrandMark />
          </Link>
          <nav className="hidden items-center gap-6 lg:flex">
            {sectionLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t(item.key)}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="hidden items-center gap-1 sm:flex">
            <ThemeToggle compact />
            <LocaleSwitcher compact />
          </div>
          <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
          {isAuthenticated ? (
            <Link
              href="/app"
              className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
            >
              {t("workspace")}
              <ArrowRight aria-hidden="true" className="size-3.5 rtl:rotate-180" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "hidden sm:inline-flex",
                )}
              >
                {t("login")}
              </Link>
              <Link
                href="/register"
                className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
              >
                {t("start")}
              </Link>
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            aria-label={isOpen ? common("close") : common("open")}
            onClick={() => setIsOpen((open) => !open)}
          >
            {isOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {isOpen ? (
        <div id="mobile-navigation" className="border-t border-border/70 bg-background lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4 sm:px-8">
            {sectionLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {t(item.key)}
              </a>
            ))}
            <div className="my-2 h-px bg-border" />
            <div className="flex items-center justify-between px-3 py-1">
              <div className="flex gap-1">
                <ThemeToggle />
                <LocaleSwitcher />
              </div>
              {isAuthenticated ? (
                <Link href="/app" className={buttonVariants({ size: "sm" })}>
                  {t("workspace")}
                </Link>
              ) : (
                <div className="flex gap-2">
                  <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    {t("login")}
                  </Link>
                  <Link href="/register" className={buttonVariants({ size: "sm" })}>
                    {t("start")}
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
