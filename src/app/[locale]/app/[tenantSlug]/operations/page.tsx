import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Wrench,
  ClipboardList,
  FileText,
  Layers,
  DollarSign,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getTenantAccess, hasTenantPermission } from "@/lib/tenants/context";
import { CreateAssetDialog } from "@/components/operations/create-asset-dialog";
import { CreateWorkOrderDialog } from "@/components/operations/create-work-order-dialog";
import { CreateQuotationDialog } from "@/components/operations/create-quotation-dialog";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { formatRelativeTime } from "@/lib/format";

interface OperationsPageProps {
  params: Promise<{
    locale: string;
    tenantSlug: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
}

export default async function OperationsPage(props: OperationsPageProps) {
  const { locale, tenantSlug } = await props.params;
  const search = await props.searchParams;

  const access = await getTenantAccess(locale, tenantSlug);

  if (!hasTenantPermission(access, "asset:manage") && !hasTenantPermission(access, "work-order:manage")) {
    notFound();
  }

  const t = await getTranslations("Operations");
  const tenantId = access.tenant.id;
  const activeTab = search.tab || "work-orders";

  const [workOrders, quotations, assets, customers] = await Promise.all([
    prisma.workOrder.findMany({
      where: { tenantId },
      include: {
        customer: { select: { id: true, name: true } },
        ticket: { select: { id: true, number: true, subject: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.quotation.findMany({
      where: { tenantId },
      include: {
        customer: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.asset.findMany({
      where: { tenantId },
      include: {
        customer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.customer.findMany({
      where: { tenantId, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
  ]);

  const totalQuotesValue = quotations.reduce(
    (acc, q) => acc + Number(q.total.toString()),
    0
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Wrench className="size-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {t("title")}
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "work-orders" && (
            <CreateWorkOrderDialog
              tenantSlug={tenantSlug}
              customers={customers}
            />
          )}
          {activeTab === "quotations" && (
            <CreateQuotationDialog
              tenantSlug={tenantSlug}
              customers={customers}
            />
          )}
          {activeTab === "assets" && (
            <CreateAssetDialog
              tenantSlug={tenantSlug}
              customers={customers}
            />
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("metrics.workOrders")}
            </span>
            <ClipboardList className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold">{workOrders.length}</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("metrics.quotations")}
            </span>
            <FileText className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold">{quotations.length}</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("metrics.pipelineValue")}
            </span>
            <DollarSign className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            ${totalQuotesValue.toFixed(0)}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("metrics.trackedAssets")}
            </span>
            <Layers className="size-4 text-muted-foreground/70" />
          </div>
          <div className="mt-2 text-2xl font-bold">{assets.length}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border/70 pb-3 text-xs">
        <Link
          href={`/app/${tenantSlug}/operations?tab=work-orders`}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors ${
            activeTab === "work-orders"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "border border-border/80 bg-background text-muted-foreground hover:bg-muted"
          }`}
        >
          <ClipboardList className="size-3.5" />
          <span>{t("tabs.workOrders")}</span>
          <span className="rounded-md bg-background/20 px-1 text-[10px]">
            {workOrders.length}
          </span>
        </Link>

        <Link
          href={`/app/${tenantSlug}/operations?tab=quotations`}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors ${
            activeTab === "quotations"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "border border-border/80 bg-background text-muted-foreground hover:bg-muted"
          }`}
        >
          <FileText className="size-3.5" />
          <span>{t("tabs.quotations")}</span>
          <span className="rounded-md bg-background/20 px-1 text-[10px]">
            {quotations.length}
          </span>
        </Link>

        <Link
          href={`/app/${tenantSlug}/operations?tab=assets`}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors ${
            activeTab === "assets"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "border border-border/80 bg-background text-muted-foreground hover:bg-muted"
          }`}
        >
          <Layers className="size-3.5" />
          <span>{t("tabs.assets")}</span>
          <span className="rounded-md bg-background/20 px-1 text-[10px]">
            {assets.length}
          </span>
        </Link>
      </div>

      {/* Active Tab Content */}
      {activeTab === "work-orders" && (
        workOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 p-12 text-center">
            <ClipboardList className="mx-auto size-10 text-muted-foreground/60" />
            <h3 className="mt-3 text-sm font-semibold">{t("emptyWorkOrdersTitle")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("emptyWorkOrdersDescription")}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="border-b border-border/70 bg-muted/40 text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-start">{t("table.orderNumber")}</th>
                    <th className="py-3 px-4 text-start">{t("table.title")}</th>
                    <th className="py-3 px-4 text-start">{t("table.customer")}</th>
                    <th className="py-3 px-4 text-start">{t("table.type")}</th>
                    <th className="py-3 px-4 text-start">{t("table.priority")}</th>
                    <th className="py-3 px-4 text-start">{t("table.status")}</th>
                    <th className="py-3 px-4 text-start">{t("table.date")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {workOrders.map((wo) => (
                    <tr key={wo.id} className="group transition-colors hover:bg-muted/30">
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {wo.number}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        <div>{wo.title}</div>
                        {wo.ticket && (
                          <span className="text-[10px] text-muted-foreground">
                            #{wo.ticket.number} - {wo.ticket.subject}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{wo.customer.name}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-[10px]">
                          {wo.type}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-[10px]">
                          {wo.priority}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="secondary" className="text-[10px] font-semibold">
                          {wo.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                        {formatRelativeTime(new Date(wo.createdAt), locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {activeTab === "quotations" && (
        quotations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 p-12 text-center">
            <FileText className="mx-auto size-10 text-muted-foreground/60" />
            <h3 className="mt-3 text-sm font-semibold">{t("emptyQuotationsTitle")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("emptyQuotationsDescription")}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="border-b border-border/70 bg-muted/40 text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-start">{t("table.quoteNumber")}</th>
                    <th className="py-3 px-4 text-start">{t("table.customer")}</th>
                    <th className="py-3 px-4 text-start">{t("table.itemsCount")}</th>
                    <th className="py-3 px-4 text-start">{t("table.total")}</th>
                    <th className="py-3 px-4 text-start">{t("table.status")}</th>
                    <th className="py-3 px-4 text-start">{t("table.date")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {quotations.map((qt) => (
                    <tr key={qt.id} className="group transition-colors hover:bg-muted/30">
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {qt.number}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        {qt.customer.name}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {qt.items.length} {t("itemsUnit")}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ${qt.total.toString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-[10px]">
                          {qt.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                        {formatRelativeTime(new Date(qt.createdAt), locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {activeTab === "assets" && (
        assets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 p-12 text-center">
            <Layers className="mx-auto size-10 text-muted-foreground/60" />
            <h3 className="mt-3 text-sm font-semibold">{t("emptyAssetsTitle")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("emptyAssetsDescription")}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="border-b border-border/70 bg-muted/40 text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-start">{t("table.assetName")}</th>
                    <th className="py-3 px-4 text-start">{t("table.customer")}</th>
                    <th className="py-3 px-4 text-start">{t("table.serial")}</th>
                    <th className="py-3 px-4 text-start">{t("table.location")}</th>
                    <th className="py-3 px-4 text-start">{t("table.status")}</th>
                    <th className="py-3 px-4 text-start">{t("table.date")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {assets.map((asset) => (
                    <tr key={asset.id} className="group transition-colors hover:bg-muted/30">
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        {asset.name}
                      </td>
                      <td className="py-3.5 px-4">{asset.customer.name}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                        {asset.serialNumber || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {asset.location || "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-[10px]">
                          {asset.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                        {formatRelativeTime(new Date(asset.createdAt), locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
