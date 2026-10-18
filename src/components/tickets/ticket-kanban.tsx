"use client";

import { useTranslations } from "next-intl";
import { Clock, AlertTriangle, User, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { getSlaRemainingInfo } from "@/lib/tickets/sla";
import { type TicketPriority, type TicketStatus } from "@prisma/client";

export interface KanbanTicket {
  id: string;
  number: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  firstResponseDueAt: Date | null;
  resolutionDueAt: Date | null;
  firstRespondedAt: Date | null;
  resolvedAt: Date | null;
  customer: {
    name: string;
  };
  department?: {
    name: string;
  } | null;
  assignee?: {
    user: {
      name: string | null;
      email: string;
    };
  } | null;
}

interface TicketKanbanProps {
  tenantSlug: string;
  tickets: KanbanTicket[];
}

const statusColumns: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "PENDING_CUSTOMER",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
];

const priorityVariant: Record<
  TicketPriority,
  "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
> = {
  LOW: "secondary",
  MEDIUM: "outline",
  HIGH: "warning",
  URGENT: "destructive",
};

export function TicketKanban({ tenantSlug, tickets }: TicketKanbanProps) {
  const t = useTranslations("Tickets");

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-2">
      {statusColumns.map((status) => {
        const columnTickets = tickets.filter((tk) => tk.status === status);

        return (
          <div
            key={status}
            className="flex w-72 shrink-0 flex-col rounded-2xl border border-border/70 bg-card/60 shadow-xs"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between border-b border-border/70 p-3.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  {t(`statuses.${status}`)}
                </span>
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {columnTickets.length}
                </Badge>
              </div>
            </div>

            {/* Cards Container */}
            <div className="flex flex-1 flex-col gap-2.5 p-3 min-h-96">
              {columnTickets.length === 0 ? (
                <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-border/50 p-6 text-center text-[11px] text-muted-foreground">
                  {t("noTicketsInColumn")}
                </div>
              ) : (
                columnTickets.map((ticket) => {
                  const firstResponseSla = getSlaRemainingInfo(
                    ticket.firstResponseDueAt,
                    ticket.firstRespondedAt,
                  );

                  return (
                    <Link
                      key={ticket.id}
                      href={`/app/${tenantSlug}/tickets/${ticket.id}`}
                      className="group flex flex-col rounded-xl border border-border bg-card p-3.5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                          #{ticket.number}
                        </span>
                        <Badge
                          variant={priorityVariant[ticket.priority]}
                          className="text-[9px] px-1.5 py-0 h-4"
                        >
                          {t(`priorities.${ticket.priority}`)}
                        </Badge>
                      </div>

                      <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-5 group-hover:text-primary transition-colors">
                        {ticket.subject}
                      </h4>

                      <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                        <Building className="size-3 shrink-0" />
                        <span className="truncate">{ticket.customer.name}</span>
                      </div>

                      {/* Footer: SLA timer badge and Assignee */}
                      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[10px]">
                        {firstResponseSla ? (
                          firstResponseSla.isBreached ? (
                            <span className="inline-flex items-center gap-1 text-destructive font-semibold">
                              <AlertTriangle className="size-3" />
                              {firstResponseSla.label}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Clock className="size-3 text-primary" />
                              {firstResponseSla.label}
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}

                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="size-3" />
                          <span className="truncate max-w-20">
                            {ticket.assignee?.user.name?.split(/\s+/)[0] || t("unassigned")}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
