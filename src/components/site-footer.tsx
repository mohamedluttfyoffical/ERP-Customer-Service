import { getLocale, getTranslations } from "next-intl/server";

import { BrandMark } from "@/components/brand-mark";
import { Link } from "@/i18n/navigation";

export async function SiteFooter() {
  const t = await getTranslations("Landing.footer");
  const locale = await getLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-card/40">
      <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-14">
        <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div className="max-w-sm">
            <BrandMark />
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{t("tagline")}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-foreground">{t("product")}</p>
            <div className="mt-4 flex flex-col items-start gap-3 text-sm text-muted-foreground">
              <a href={`/${locale}/#features`} className="transition-colors hover:text-foreground">
                {t("features")}
              </a>
              <a href={`/${locale}/#pricing`} className="transition-colors hover:text-foreground">
                {t("pricing")}
              </a>
              <a href={`/${locale}/#faq`} className="transition-colors hover:text-foreground">
                {t("faq")}
              </a>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-foreground">{t("company")}</p>
            <div className="mt-4 flex flex-col items-start gap-3 text-sm text-muted-foreground">
              <Link href="/login" className="transition-colors hover:text-foreground">
                {t("login")}
              </Link>
              <Link href="/register" className="transition-colors hover:text-foreground">
                {t("register")}
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>{t("copyright", { year })}</p>
          <p className="font-mono text-[10px] tracking-wide uppercase">Sanad ERP · SaaS</p>
        </div>
      </div>
    </footer>
  );
}
