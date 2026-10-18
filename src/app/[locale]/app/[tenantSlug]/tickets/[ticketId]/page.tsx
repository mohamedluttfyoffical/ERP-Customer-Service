import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Clock,
  Wrench,
  Activity,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getTenantAccess, hasTenantPermission } from "@/lib/tenants/context";
import { TicketConversation, type ConversationMessage } from "@/components/tickets/ticket-conversation";
import { TicketDetailControls } from "@/components/tickets/ticket-detail-controls";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { formatRelativeTime } from "@/lib/format";
import { getSlaRemainingInfo } from "@/lib/tickets/sla";
import { type TicketPriority, type TicketStatus } from "@prisma/client";

interface TicketDetailPageProps {
  params: Promise<{
    locale: string;
    tenantSlug: string;
    ticketId: string;
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

export default async function TicketDetailPage(props: TicketDetailPageProps) {
  const { locale, tenantSlug, ticketId } = await props.params;

  const access = await getTenantAccess(locale, tenantSlug);

  if (!hasTenantPermission(access, "ticket:read")) {
    notFound();
  }

  const t = await getTranslations("Tickets");
  const tenantId = access.tenant.id;

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, tenantId },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          type: true,
          email: true,
          phone: true,
          city: true,
          industry: true,
          healthScore: true,
        },
      },
      department: { select: { id: true, name: true } },
      assignee: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      messages: {
        include: {
          senderUser: { select: { name: true, email: true } },
          senderContact: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      workOrders: {
        select: {
          id: true,
          number: true,
          title: true,
          status: true,
          totalCost: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      quotations: {
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  // Get active tenant members for assignment dropdown
  const memberships = await prisma.membership.findMany({
    where: { tenantId, status: "ACTIVE" },
    include: {
      user: { select: { name: true, email: true } },
      role: { select: { name: true } },
    },
  });

  const memberOptions = memberships.map((m) => ({
    membershipId: m.id,
    name: m.user.name || "",
    email: m.user.email,
    role: m.role.name,
  }));

  const canUpdate = hasTenantPermission(access, "ticket:update");
  const canAssign = hasTenantPermission(access, "ticket:assign");

  const conversationMessages: ConversationMessage[] = ticket.messages.map((m) => ({
    id: m.id,
    senderType: m.senderType,
    visibility: m.visibility,
    body: m.body,
    createdAt: m.createdAt,
    senderUser: m.senderUser,
    senderContact: m.senderContact,
  }));

  // Calculate dynamic SLA infos
  const responseSlaInfo = getSlaRemainingInfo(ticket.firstResponseDueAt);
  const resolutionSlaInfo = getSlaRemainingInfo(ticket.resolutionDueAt);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/app/${tenantSlug}/tickets`}
            className="grid size-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            aria-label={t("backToTickets")}
          >
            <ArrowLeft className="size-4 ltr:rotate-0 rtl:rotate-180" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-muted-foreground">
                #{ticket.number}
              </span>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                {ticket.subject}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{ticket.customer.name}</span>
              {ticket.department && (
                <>
                  <span>•</span>
                  <span>{ticket.department.name}</span>
                </>
              )}
              <span>•</span>
              <span>{formatRelativeTime(new Date(ticket.createdAt), locale)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={priorityBadgeVariant[ticket.priority]}
            className="text-xs uppercase font-semibold"
          >
            {t(`priorities.${ticket.priority}`)}
          </Badge>
          <Badge
            variant={statusBadgeVariant[ticket.status]}
            className="text-xs font-semibold"
          >
            {t(`statuses.${ticket.status}`)}
          </Badge>
        </div>
      </div>

      {/* Main Content Layout: Two Columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Left Column: Description & Conversation */}
        <div className="space-y-6">
          {/* Initial Ticket Description Card */}
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {t("initialDescription")}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {ticket.channel}
              </Badge>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {ticket.description}
            </p>
          </div>

          {/* Conversation & Reply Composer */}
          <TicketConversation
            tenantSlug={tenantSlug}
            ticketId={ticket.id}
            messages={conversationMessages}
            canReply={canUpdate}
          />
        </div>

        {/* Right Column: Controls, SLA, Customer 360, Operations */}
        <div className="space-y-5">
          {/* Ticket Controls Card */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              {t("controlsTitle")}
            </h3>
            <TicketDetailControls
              tenantSlug={tenantSlug}
              ticketId={ticket.id}
              currentStatus={ticket.status}
              currentAssigneeId={ticket.assigneeMembershipId}
              members={memberOptions}
              canUpdate={canUpdate}
              canAssign={canAssign}
            />
          </div>

          {/* SLA Tracking Card */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("slaCardTitle")}
              </h3>
              <Clock className="size-4 text-primary" />
            </div>

            <div className="space-y-3 text-xs">
              {/* First Response Target */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("firstResponseTarget")}
                  </span>
                  {ticket.firstRespondedAt ? (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                      {t("slaMet")}
                    </Badge>
                  ) : responseSlaInfo ? (
                    <span
                      className={`font-mono font-semibold ${
                        responseSlaInfo.breached
                          ? "text-destructive"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {responseSlaInfo.text}
                    </span>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </div>

              {/* Resolution Target */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("resolutionTarget")}
                  </span>
                  {ticket.resolvedAt ? (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                      {t("slaMet")}
                    </Badge>
                  ) : resolutionSlaInfo ? (
                    <span
                      className={`font-mono font-semibold ${
                        resolutionSlaInfo.breached
                          ? "text-destructive"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {resolutionSlaInfo.text}
                    </span>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Customer 360 Preview Card */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("customerCardTitle")}
              </h3>
              <Building2 className="size-4 text-primary" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-sm">
                  {ticket.customer.name}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {ticket.customer.type}
                </Badge>
              </div>

              {ticket.customer.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-3.5 shrink-0" />
                  <span className="truncate">{ticket.customer.email}</span>
                </div>
              )}

              {ticket.customer.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-3.5 shrink-0" />
                  <span dir="ltr">{ticket.customer.phone}</span>
                </div>
              )}

              {ticket.customer.city && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="size-3.5 shrink-0" />
                  <span>{ticket.customer.city}</span>
                </div>
              )}

              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                <span className="text-muted-foreground">{t("healthScore")}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {ticket.customer.healthScore}%
                </span>
              </div>
            </div>
          </div>

          {/* Linked ERP Operations (Work Orders & Quotations) */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("operationsCardTitle")}
              </h3>
              <Wrench className="size-4 text-primary" />
            </div>

            <div className="space-y-3">
              {/* Linked Work Orders */}
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                  {t("linkedWorkOrders")} ({ticket.workOrders.length})
                </span>
                {ticket.workOrders.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic">
                    {t("noWorkOrdersLinked")}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {ticket.workOrders.map((wo) => (
                      <div
                        key={wo.id}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-2 text-xs"
                      >
                        <span className="font-mono font-medium">{wo.number}</span>
                        <Badge variant="outline" className="text-[9px]">
                          {wo.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Linked Quotations */}
              <div className="pt-2 border-t border-border/40">
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                  {t("linkedQuotations")} ({ticket.quotations.length})
                </span>
                {ticket.quotations.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic">
                    {t("noQuotationsLinked")}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {ticket.quotations.map((qt) => (
                      <div
                        key={qt.id}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-2 text-xs"
                      >
                        <span className="font-mono font-medium">{qt.number}</span>
                        <Badge variant="outline" className="text-[9px]">
                          ${qt.total.toString()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Link
                  href={`/app/${tenantSlug}/operations`}
                  className="block text-center rounded-lg border border-border/80 bg-muted/30 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  {t("manageOperationsLink")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
