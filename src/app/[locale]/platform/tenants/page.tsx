import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Building2, Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { TenantRowActions } from "@/components/platform/tenant-row-actions";
import { localizePlan } from "@/lib/tenants/presentation";
import { Link } from "@/i18n/navigation";
import type { TenantStatus, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Platform.tenants" });
  return { title: t("title") };
}

const statusVariant: Record<
  TenantStatus,
  "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
> = {
  PROVISIONING: "secondary",
  TRIALING: "warning",
  ACTIVE: "success",
  PAST_DUE: "destructive",
  SUSPENDED: "destructive",
  CANCELED: "secondary",
};

interface TenantsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function TenantsPage({ params, searchParams }: TenantsPageProps) {
  const { locale } = await params;
  const { q, status } = await searchParams;
  setRequestLocale(locale);
  await requireSuperAdmin(locale);

  const t = await getTranslations("Platform.tenants");
  const platformT = await getTranslations("Platform");

  const whereClause: Prisma.TenantWhereInput = {};
  if (q && q.trim()) {
    whereClause.OR = [
      { name: { contains: q.trim(), mode: "insensitive" } },
      { slug: { contains: q.trim(), mode: "insensitive" } },
      { email: { contains: q.trim(), mode: "insensitive" } },
    ];
  }
  if (status && status !== "ALL" && status in statusVariant) {
    whereClause.status = status as TenantStatus;
  }

  const [tenants, totalCount] = await Promise.all([
    prisma.tenant.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        _count: {
          select: { memberships: true, tickets: true },
        },
        subscriptions: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { plan: true },
        },
      },
    }),
    prisma.tenant.count({ where: whereClause }),
  ]);

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const number = new Intl.NumberFormat(locale);

  const filterTabs = [
    { key: "ALL", label: t("filterAll") },
    { key: "ACTIVE", label: platformT("statuses.ACTIVE") },
    { key: "TRIALING", label: platformT("statuses.TRIALING") },
    { key: "PAST_DUE", label: platformT("statuses.PAST_DUE") },
    { key: "SUSPENDED", label: platformT("statuses.SUSPENDED") },
    { key: "CANCELED", label: platformT("statuses.CANCELED") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Badge variant="outline" className="w-fit">
          <Building2 className="size-3 text-primary me-1.5" />
          {t("totalCount", { count: number.format(totalCount) })}
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          {filterTabs.map((tab) => {
            const isSelected = (!status && tab.key === "ALL") || status === tab.key;
            return (
              <Link
                key={tab.key}
                href={`/platform/tenants?status=${tab.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition-colors whitespace-nowrap ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-card border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Search */}
        <form className="relative min-w-64" method="GET">
          {status && status !== "ALL" ? (
            <input type="hidden" name="status" value={status} />
          ) : null}
          <Search className="absolute start-3 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-border bg-card ps-9 pe-3 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
        </form>
      </div>

      {/* Tenants Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="hidden grid-cols-[1.4fr_0.8fr_0.8fr_0.6fr_0.8fr_1fr] gap-4 border-b border-border/70 bg-muted/30 px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
          <span>{t("colTenant")}</span>
          <span>{t("colStatus")}</span>
          <span>{t("colPlan")}</span>
          <span>{t("colMembers")}</span>
          <span>{t("colCreated")}</span>
          <span className="text-end">{t("colActions")}</span>
        </div>

        {tenants.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">{t("empty")}</div>
        ) : (
          <div className="divide-y divide-border/70">
            {tenants.map((tenant) => {
              const sub = tenant.subscriptions[0];
              const planName = localizePlan(sub?.plan, locale);

              return (
                <div
                  key={tenant.id}
                  className="grid gap-3 p-4 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.6fr_0.8fr_1fr] md:items-center md:gap-4 md:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{tenant.name}</p>
                    <p
                      dir="ltr"
                      className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground"
                    >
                      /{tenant.slug} · {tenant.email}
                    </p>
                  </div>

                  <div>
                    <Badge variant={statusVariant[tenant.status]} className="text-[10px]">
                      {platformT(`statuses.${tenant.status}`)}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{planName}</span>
                    {sub?.interval ? (
                      <span className="ms-1 text-[10px]">
                        ({sub.interval === "ANNUAL" ? t("annual") : t("monthly")})
                      </span>
                    ) : null}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {number.format(tenant._count.memberships)} {t("membersCount")}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {dateFormatter.format(tenant.createdAt)}
                  </div>

                  <div>
                    <TenantRowActions
                      tenantId={tenant.id}
                      tenantName={tenant.name}
                      currentStatus={tenant.status}
                    />
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
