import { getTranslations } from "next-intl/server";
import { Compass } from "lucide-react";

import { Link } from "@/i18n/navigation";

export default async function LocaleNotFound() {
  const t = await getTranslations("Errors");

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-primary/15 bg-primary/[0.06] text-primary">
          <Compass aria-hidden="true" className="size-5" />
        </span>
        <p className="mt-5 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
          404
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{t("notFoundDescription")}</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
