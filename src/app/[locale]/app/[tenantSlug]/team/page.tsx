import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { UserRoundCheck, Users } from "lucide-react";

import { AccessDenied } from "@/components/workspace/access-denied";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { getTenantAccess, hasTenantPermission } from "@/lib/tenants/context";
import { localizeRole } from "@/lib/tenants/presentation";
import { getInitials } from "@/lib/format";
import { AgentLeaderboardCard } from "@/components/team/agent-leaderboard-card";

type TeamPageProps = {
  params: Promise<{ locale: string; tenantSlug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "App.nav" });
  return { title: t("team") };
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { locale, tenantSlug } = await params;
  setRequestLocale(locale);

  const access = await getTenantAccess(locale, tenantSlug);
  if (!hasTenantPermission(access, "member:read")) {
    return <AccessDenied tenantSlug={tenantSlug} />;
  }

  const [members, t] = await Promise.all([
    prisma.membership.findMany({
      where: { tenantId: access.tenant.id },
      select: {
        id: true,
        title: true,
        status: true,
        joinedAt: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, image: true } },
        role: { select: { key: true, name: true, permissions: true } },
        department: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    getTranslations("Team"),
  ]);

  const number = new Intl.NumberFormat(locale);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const statusVariant = {
    ACTIVE: "success",
    INVITED: "warning",
    SUSPENDED: "destructive",
    REMOVED: "secondary",
  } as const;

  const sortedMembers = [...members].sort((a, b) => {
    const order = { ACTIVE: 0, INVITED: 1, SUSPENDED: 2, REMOVED: 3 } as const;
    return order[a.status] - order[b.status];
  });

  return (
    <div>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">{t("eyebrow")}</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Badge variant="outline" className="w-fit bg-card">
          <Users aria-hidden="true" className="size-3" />
          {t("count", { count: number.format(members.length) })}
        </Badge>
      </div>

      <section className="mt-7 overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="hidden grid-cols-[1.6fr_1fr_0.9fr_0.7fr_0.7fr] gap-4 border-b border-border/70 bg-muted/30 px-5 py-3 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase md:grid">
          <span>{t("table.member")}</span>
          <span>{t("table.role")}</span>
          <span>{t("table.department")}</span>
          <span>{t("table.status")}</span>
          <span>{t("table.joined")}</span>
        </div>

        {sortedMembers.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-muted-foreground">{t("empty")}</div>
        ) : (
          <div className="divide-y divide-border/70">
            {sortedMembers.map((member) => {
              const displayName = member.user.name ?? member.user.email;
              const roleLabel = localizeRole(member.role, locale);
              const joinedAt = member.joinedAt ?? member.createdAt;
              return (
                <div
                  key={member.id}
                  className="grid gap-3 px-5 py-4 md:grid-cols-[1.6fr_1fr_0.9fr_0.7fr_0.7fr] md:items-center md:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-semibold">
                      {getInitials(displayName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        {displayName}
                        {member.user.id === access.user.id ? (
                          <span className="ms-1.5 text-[9px] text-primary">· {t("you")}</span>
                        ) : null}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {member.user.email}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium">{roleLabel}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {t("roles.permissions", {
                        count: number.format(member.role.permissions.length),
                      })}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">{member.department?.name ?? "—"}</p>

                  <div>
                    <Badge variant={statusVariant[member.status]} className="text-[9px]">
                      {t(`status.${member.status}`)}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    {dateFormatter.format(joinedAt)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Agent Performance Leaderboard */}
      <AgentLeaderboardCard tenantId={access.tenant.id} locale={locale} />

      <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground">
        <UserRoundCheck aria-hidden="true" className="size-3.5 text-primary" />
        tenantId · <span className="font-mono">{access.tenant.id}</span>
      </div>
    </div>
  );
}
