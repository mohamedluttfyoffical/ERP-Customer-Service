"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function LocaleError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors");

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-destructive/15 bg-destructive/[0.06] text-destructive">
          <AlertTriangle aria-hidden="true" className="size-5" />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">{t("errorTitle")}</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{t("errorDescription")}</p>
        <Button type="button" onClick={reset} className="mt-6">
          <RotateCcw aria-hidden="true" className="size-4" />
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}
