import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  LifeBuoy,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  ArrowRight,
  Flame,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getTenantAccess, hasTenantPermission } from "@/lib/tenants/context";
import { CreateTicketDialog } from "@/components/tickets/create-ticket-dialog";
import { TicketFilters } from "@/components/tickets/ticket-filters";
import { TicketKanban, type KanbanTicket } from "@/components/tickets/ticket-kanban";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { formatRelativeTime } from "@/lib/format";
import { getSlaRemainingInfo } from "@/lib/tickets/sla";
import {
  TicketPriority,
  TicketStatus,
  type Prisma,
} from "@prisma/client";

interface TicketsPageProps {
  params: Promise<{
    locale: string;
    tenantSlug: string;
  }>;
  searchParams: Promise<{
    view?: string;
    status?: string;
    priority?: string;
    q?: string;
  }>;
}

const priorityBadgeVariant: Record<
  TicketPriority,
  "default" | "secondary" | "destructive" | "outline" | "warning"
> = {
  LOW: "secondary",
  MEDIUM: "outline",
  HIGH: "warning",
  URGENT: "destructive",
};

const statusBadgeVariant: Record<
  TicketStatus,
  "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
> = {
  OPEN: "default",
  IN_PROGRESS: "warning",
  PENDING_CUSTOMER: "secondary",
  ESCALATED: "destructive",
  RESOLVED: "success",
  CLOSED: "outline",
};

export default async function TicketsPage(props: TicketsPageProps) {
  const { locale, tenantSlug } = await props.params;
  const search = await props.searchParams;

  const access = await getTenantAccess(locale, tenantSlug);

  if (!hasTenantPermission(access, "ticket:read")) {
    notFound();
  }

  const t = await getTranslations("Tickets");
  const tenantId = access.tenant.id;

  const currentView = search.view === "kanban" ? "kanban" : "list";
  const currentStatus = search.status || "ALL";
  const currentPriority = search.priority || "ALL";
  const searchQuery = search.q?.trim() || "";

  // Build Prisma filter
  const where: Prisma.TicketWhereInput = {
    tenantId,
  };

  if (currentStatus !== "ALL" && Object.values(TicketStatus).includes(currentStatus as TicketStatus)) {
    where.status = currentStatus as TicketStatus;
  }

  if (
    currentPriority !== "ALL" &&
    Object.values(TicketPriority).includes(currentPriority as TicketPriority)
  ) {
    where.priority = currentPriority as TicketPriority;
  }

  if (searchQuery) {
    const isNum = !isNaN(Number(searchQuery));
    where.OR = [
      { subject: { contains: searchQuery, mode: "insensitive" } },
      { description: { contains: searchQuery, mode: "insensitive" } },
      ...(isNum ? [{ number: Number(searchQuery) }] : []),
    ];
  }

  // Fetch tickets, stats, customers, and departments concurrently
  const [tickets, stats, customers, departments] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, type: true } },
        department: { select: { id: true, name: true } },
        assignee: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.ticket.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: { _all: true },
    }),
    prisma.customer.findMany({
      where: { tenantId, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.department.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const countByStatus = stats.reduce(
    (acc, curr) => {
      acc[curr.status] = curr._count._all;
      return acc;
    },
    {} as Record<TicketStatus, number>
  );

  const openCount = (countByStatus.OPEN || 0) + (countByStatus.IN_PROGRESS || 0);
  const escalatedCount = countByStatus.ESCALATED || 0;
  const resolvedCount = countByStatus.RESOLVED || 0;
  const totalCount = Object.values(countByStatus).reduce((a, b) => a + b, 0);

  const kanbanTickets: KanbanTicket[] = tickets.map((tk) => ({
    id: tk.id,
    number: tk.number,
    subject: tk.subject,
    status: tk.status,
    priority: tk.priority,
    firstResponseDueAt: tk.firstResponseDueAt,
    resolutionDueAt: tk.resolutionDueAt,
    firstRespondedAt: tk.firstRespondedAt,
    resolvedAt: tk.resolvedAt,
    customer: { name: tk.customer.name },
    department: tk.department ? { name: tk.department.name } : null,
    assignee: tk.assignee
      ? {
          user: {
            name: tk.assignee.user.name,
            email: tk.assignee.user.email,
          },
        }
      : null,
  }));

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <LifeBuoy className="size-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {t("title")}
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {t("subtitle")}
          </p>
        </div>

        <CreateTicketDialog
          tenantSlug={tenantSlug}
          customers={customers}
          departments={departments}
        />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("metrics.total")}
            </span>
            <Inbox className="size-4 text-muted-foreground/70" />
          </div>
          <div className="mt-2 text-2xl font-bold">{totalCount}</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("metrics.active")}
            </span>
            <Clock className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary">{openCount}</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("metrics.escalated")}
            </span>
            <Flame className="size-4 text-destructive" />
          </div>
          <div className="mt-2 text-2xl font-bold text-destructive">
            {escalatedCount}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("metrics.resolved")}
            </span>
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {resolvedCount}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <TicketFilters
        tenantSlug={tenantSlug}
        currentView={currentView}
        currentStatus={currentStatus}
        currentPriority={currentPriority}
        searchQuery={searchQuery}
      />

      {/* Tickets Content View */}
      {currentView === "kanban" ? (
        <TicketKanban tenantSlug={tenantSlug} tickets={kanbanTickets} />
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 p-12 text-center">
          <Inbox className="mx-auto size-10 text-muted-foreground/60" />
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
                  <th className="py-3 px-4 text-start">{t("table.ticket")}</th>
                  <th className="py-3 px-4 text-start">{t("table.customer")}</th>
                  <th className="py-3 px-4 text-start">{t("table.priority")}</th>
                  <th className="py-3 px-4 text-start">{t("table.status")}</th>
                  <th className="py-3 px-4 text-start">{t("table.sla")}</th>
                  <th className="py-3 px-4 text-start">{t("table.assignee")}</th>
                  <th className="py-3 px-4 text-start">{t("table.date")}</th>
                  <th className="py-3 px-4 text-end">{t("table.action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {tickets.map((ticket) => {
                  const targetDate =
                    ticket.status === "RESOLVED" || ticket.status === "CLOSED"
                      ? null
                      : !ticket.firstRespondedAt
                        ? ticket.firstResponseDueAt
                        : ticket.resolutionDueAt;

                  const slaInfo = getSlaRemainingInfo(targetDate);

                  return (
                    <tr
                      key={ticket.id}
                      className="group transition-colors hover:bg-muted/30"
                    >
                      <td className="py-3.5 px-4 font-medium">
                        <Link
                          href={`/app/${tenantSlug}/tickets/${ticket.id}`}
                          className="flex flex-col hover:text-primary transition-colors"
                        >
                          <span className="font-mono text-[11px] text-muted-foreground">
                            #{ticket.number}
                          </span>
                          <span className="font-semibold text-foreground line-clamp-1">
                            {ticket.subject}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-foreground">
                          {ticket.customer.name}
                        </span>
                        {ticket.department && (
                          <span className="block text-[10px] text-muted-foreground">
                            {ticket.department.name}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={priorityBadgeVariant[ticket.priority]}
                          className="text-[10px] uppercase font-semibold"
                        >
                          {t(`priorities.${ticket.priority}`)}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={statusBadgeVariant[ticket.status]}
                          className="text-[10px] font-semibold"
                        >
                          {t(`statuses.${ticket.status}`)}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        {slaInfo ? (
                          <div
                            className={`flex items-center gap-1 font-mono text-[11px] font-semibold ${
                              slaInfo.breached
                                ? "text-destructive"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {slaInfo.breached ? (
                              <AlertTriangle className="size-3 shrink-0" />
                            ) : (
                              <Clock className="size-3 shrink-0" />
                            )}
                            <span>{slaInfo.text}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">
                            —
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {ticket.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                              {ticket.assignee.user.name?.charAt(0) || "U"}
                            </span>
                            <span className="truncate max-w-[120px]">
                              {ticket.assignee.user.name || ticket.assignee.user.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">
                            {t("unassigned")}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                        {formatRelativeTime(new Date(ticket.createdAt), locale)}
                      </td>
                      <td className="py-3.5 px-4 text-end">
                        <Link
                          href={`/app/${tenantSlug}/tickets/${ticket.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-background px-2.5 py-1 text-[11px] font-medium transition-colors hover:border-primary hover:text-primary"
                        >
                          <span>{t("viewDetails")}</span>
                          <ArrowRight className="size-3 ltr:rotate-0 rtl:rotate-180" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
