import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Building2,
  Users,
  UserCheck,
  Mail,
  Phone,
  Wrench,
  Search,
  LifeBuoy,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getTenantAccess, hasTenantPermission } from "@/lib/tenants/context";
import { CreateCustomerDialog } from "@/components/crm/create-customer-dialog";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { formatRelativeTime } from "@/lib/format";
import { type CustomerType, type Prisma } from "@prisma/client";

interface CrmPageProps {
  params: Promise<{
    locale: string;
    tenantSlug: string;
  }>;
  searchParams: Promise<{
    q?: string;
    type?: string;
  }>;
}

export default async function CrmPage(props: CrmPageProps) {
  const { locale, tenantSlug } = await props.params;
  const search = await props.searchParams;

  const access = await getTenantAccess(locale, tenantSlug);

  if (!hasTenantPermission(access, "customer:read")) {
    notFound();
  }

  const t = await getTranslations("Crm");
  const tenantId = access.tenant.id;

  const searchQuery = search.q?.trim() || "";
  const filterType = search.type || "ALL";

  const where: Prisma.CustomerWhereInput = {
    tenantId,
    status: "ACTIVE",
  };

  if (filterType === "COMPANY" || filterType === "INDIVIDUAL") {
    where.type = filterType as CustomerType;
  }

  if (searchQuery) {
    where.OR = [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { email: { contains: searchQuery, mode: "insensitive" } },
      { phone: { contains: searchQuery, mode: "insensitive" } },
      { city: { contains: searchQuery, mode: "insensitive" } },
      { industry: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  const [customers, totalCompanies, totalIndividuals, totalAssets] =
    await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: {
              tickets: true,
              assets: true,
              workOrders: true,
            },
          },
        },
        orderBy: { name: "asc" },
        take: 100,
      }),
      prisma.customer.count({
        where: { tenantId, type: "COMPANY", status: "ACTIVE" },
      }),
      prisma.customer.count({
        where: { tenantId, type: "INDIVIDUAL", status: "ACTIVE" },
      }),
      prisma.asset.count({
        where: { tenantId, status: "ACTIVE" },
      }),
    ]);

  const totalCount = totalCompanies + totalIndividuals;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {t("title")}
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {t("subtitle")}
          </p>
        </div>

        <CreateCustomerDialog tenantSlug={tenantSlug} />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("metrics.total")}
            </span>
            <Users className="size-4 text-muted-foreground/70" />
          </div>
          <div className="mt-2 text-2xl font-bold">{totalCount}</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("metrics.companies")}
            </span>
            <Building2 className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary">
            {totalCompanies}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("metrics.individuals")}
            </span>
            <UserCheck className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary">
            {totalIndividuals}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("metrics.assets")}
            </span>
            <Wrench className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {totalAssets}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <Link
            href={`/app/${tenantSlug}/crm`}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              filterType === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border/80 bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {t("filterAll")}
          </Link>
          <Link
            href={`/app/${tenantSlug}/crm?type=COMPANY`}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              filterType === "COMPANY"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border/80 bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {t("types.COMPANY")}
          </Link>
          <Link
            href={`/app/${tenantSlug}/crm?type=INDIVIDUAL`}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              filterType === "INDIVIDUAL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border/80 bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {t("types.INDIVIDUAL")}
          </Link>
        </div>

        <form method="GET" className="relative w-full sm:w-72">
          <Search className="absolute start-3 top-2.5 size-3.5 text-muted-foreground" />
          <input
            type="text"
            name="q"
            defaultValue={searchQuery}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-input bg-card ps-9 pe-3 py-1.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
        </form>
      </div>

      {/* Customer List Table */}
      {customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 p-12 text-center">
          <Building2 className="mx-auto size-10 text-muted-foreground/60" />
          <h3 className="mt-3 text-sm font-semibold">{t("emptyTitle")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="border-b border-border/70 bg-muted/40 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4 text-start">{t("table.customer")}</th>
                  <th className="py-3 px-4 text-start">{t("table.type")}</th>
                  <th className="py-3 px-4 text-start">{t("table.contact")}</th>
                  <th className="py-3 px-4 text-start">{t("table.industry")}</th>
                  <th className="py-3 px-4 text-start">{t("table.health")}</th>
                  <th className="py-3 px-4 text-start">{t("table.tickets")}</th>
                  <th className="py-3 px-4 text-start">{t("table.assets")}</th>
                  <th className="py-3 px-4 text-start">{t("table.created")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="group transition-colors hover:bg-muted/30"
                  >
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                          {customer.name.charAt(0)}
                        </span>
                        <span>{customer.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="text-[10px] font-medium">
                        {t(`types.${customer.type}`)}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      <div className="space-y-0.5">
                        {customer.email && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Mail className="size-3 shrink-0" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-1.5 text-[11px]" dir="ltr">
                            <Phone className="size-3 shrink-0" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {!customer.email && !customer.phone && <span>—</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      <span>{customer.industry || "—"}</span>
                      {customer.city && (
                        <span className="block text-[10px] text-muted-foreground/70">
                          {customer.city}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${customer.healthScore}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          {customer.healthScore}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/app/${tenantSlug}/tickets?q=${encodeURIComponent(customer.name)}`}
                        className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                      >
                        <LifeBuoy className="size-3" />
                        <span>{customer._count.tickets}</span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-muted-foreground">
                        {customer._count.assets}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                      {formatRelativeTime(new Date(customer.createdAt), locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
