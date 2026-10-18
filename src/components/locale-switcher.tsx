"use client";

import { useTransition } from "react";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("Language");
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const nextLocale = locale === "ar" ? "en" : "ar";

  function switchLocale() {
    const search = window.location.search;
    const hash = window.location.hash;
    startTransition(() => {
      router.replace(`${pathname}${search}${hash}`, { locale: nextLocale });
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={compact ? "icon-sm" : "sm"}
      onClick={switchLocale}
      disabled={isPending}
      aria-label={t("label")}
      title={t("switchTo")}
      className="gap-1.5 text-muted-foreground hover:text-foreground"
    >
      <Languages aria-hidden="true" className="size-4" />
      {!compact ? <span className="text-xs font-semibold">{t("switchTo")}</span> : null}
    </Button>
  );
}
