import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { APP_CONFIG } from "@/lib/config";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type AuthLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AuthLayout({ children, params }: AuthLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth.shell");

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.85fr)]">
      <div className="flex min-h-dvh flex-col">
        <header className="flex h-17 items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label={APP_CONFIG.name}>
            <BrandMark />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle compact />
            <LocaleSwitcher compact />
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 sm:py-12">
          <div className="w-full max-w-[460px]">{children}</div>
        </main>

        <footer className="flex h-16 items-center justify-between px-5 text-[10px] text-muted-foreground sm:px-8">
          <span>
            © {new Date().getFullYear()} {APP_CONFIG.fullName}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LockKeyhole className="size-3" />
            TLS · Password hashing
          </span>
        </footer>
      </div>

      <aside className="relative hidden overflow-hidden border-s border-border/60 bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -end-24 -top-24 size-[400px] rounded-full border border-primary-foreground/15"
        />
        <div
          aria-hidden="true"
          className="absolute -start-28 -bottom-36 size-[440px] rounded-full border border-primary-foreground/10"
        />

        <div className="relative">
          <Badge className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground">
            <Sparkles aria-hidden="true" className="size-3" />
            {t("eyebrow")}
          </Badge>
          <h2 className="mt-7 max-w-md text-3xl leading-[1.3] font-semibold tracking-tight text-balance">
            {t("title")}
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-primary-foreground/70">
            {t("description")}
          </p>

          <div className="mt-9 space-y-3">
            {[t("pointOne"), t("pointTwo"), t("pointThree")].map((point) => (
              <div
                key={point}
                className="flex items-center gap-2.5 text-xs text-primary-foreground/85"
              >
                <span className="grid size-5 place-items-center rounded-full bg-primary-foreground/10">
                  <Check aria-hidden="true" className="size-3" strokeWidth={2.8} />
                </span>
                {point}
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/[0.07] p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-primary-foreground/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary-foreground/70" />
                <span className="text-[11px] font-medium">{t("cardTitle")}</span>
              </div>
              <ShieldCheck className="size-4 text-primary-foreground/60" />
            </div>
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center gap-2 text-[10px] text-primary-foreground/70">
                <span className="size-1.5 rounded-full bg-primary-foreground/50" />
                {t("cardIsolation")}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-primary-foreground/70">
                <span className="size-1.5 rounded-full bg-primary-foreground/50" />
                {t("cardRbac")}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-primary-foreground/70">
                <span className="size-1.5 rounded-full bg-primary-foreground/50" />
                {t("cardSession")}
              </div>
            </div>
          </div>
          <p className="mt-4 inline-flex items-center gap-2 text-[10px] text-primary-foreground/60">
            <LockKeyhole aria-hidden="true" className="size-3" />
            {t("trust")}
          </p>
        </div>
      </aside>
    </div>
  );
}
