import { getTranslations } from "next-intl/server";
import { ArrowRight, LockKeyhole } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";

export async function AccessDenied({ tenantSlug }: { tenantSlug: string }) {
  const t = await getTranslations("App.accessDenied");

  return (
    <div className="mx-auto flex min-h-[58vh] max-w-lg flex-col items-center justify-center text-center">
      <span className="grid size-14 place-items-center rounded-2xl border border-destructive/15 bg-destructive/[0.06] text-destructive">
        <LockKeyhole aria-hidden="true" className="size-6" strokeWidth={1.8} />
      </span>
      <Badge variant="destructive" className="mt-5">
        403
      </Badge>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">{t("description")}</p>
      <Link
        href={`/app/${tenantSlug}`}
        className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        {t("back")}
        <ArrowRight aria-hidden="true" className="size-3.5 rtl:rotate-180" />
      </Link>
    </div>
  );
}
