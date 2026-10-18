import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { History } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Platform.audit" });
  return { title: t("title") };
}

export default async function AuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin(locale);

  const t = await getTranslations("Platform.audit");

  const logs = await prisma.auditLog.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      actor: {
        select: { name: true, email: true },
      },
      tenant: {
        select: { name: true, slug: true },
      },
    },
  });

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Badge variant="outline" className="w-fit">
          <History className="size-3 text-primary me-1.5" />
          {t("logCount", { count: logs.length })}
        </Badge>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="hidden grid-cols-[1.2fr_1fr_1.2fr_0.8fr_1fr] gap-4 border-b border-border/70 bg-muted/30 px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
          <span>{t("colAction")}</span>
          <span>{t("colActor")}</span>
          <span>{t("colTenant")}</span>
          <span>{t("colEntity")}</span>
          <span className="text-end">{t("colDate")}</span>
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">{t("empty")}</div>
        ) : (
          <div className="divide-y divide-border/70">
            {logs.map((log) => {
              const actor = log.actor ? log.actor.name || log.actor.email : log.actorType;
              const tenantName = log.tenant ? log.tenant.name : "—";

              return (
                <div
                  key={log.id}
                  className="grid gap-2 p-4 md:grid-cols-[1.2fr_1fr_1.2fr_0.8fr_1fr] md:items-center md:gap-4 md:px-5"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {log.action}
                    </span>
                    {log.after ? (
                      <pre
                        dir="ltr"
                        className="mt-1 max-w-xs truncate font-mono text-[9px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded"
                      >
                        {JSON.stringify(log.after)}
                      </pre>
                    ) : null}
                  </div>

                  <div className="text-xs">
                    <p className="font-medium truncate">{actor}</p>
                    {log.ipAddress ? (
                      <p dir="ltr" className="font-mono text-[9px] text-muted-foreground">
                        {log.ipAddress}
                      </p>
                    ) : null}
                  </div>

                  <div className="text-xs text-muted-foreground truncate">
                    {tenantName}
                    {log.tenant ? (
                      <span dir="ltr" className="font-mono text-[10px] block text-muted-foreground">
                        /{log.tenant.slug}
                      </span>
                    ) : null}
                  </div>

                  <div className="text-xs">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {log.entityType}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground text-end">
                    {dateFormatter.format(log.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
