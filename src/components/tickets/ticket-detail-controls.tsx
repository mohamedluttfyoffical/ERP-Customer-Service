"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  updateTicketStatusAction,
  assignTicketAction,
} from "@/lib/tickets/actions";
import { type TicketStatus } from "@prisma/client";

interface MemberOption {
  membershipId: string;
  name: string;
  email: string;
  role: string;
}

interface TicketDetailControlsProps {
  tenantSlug: string;
  ticketId: string;
  currentStatus: TicketStatus;
  currentAssigneeId: string | null;
  members: MemberOption[];
  canUpdate: boolean;
  canAssign: boolean;
}

const statusOptions: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "PENDING_CUSTOMER",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
];

export function TicketDetailControls({
  tenantSlug,
  ticketId,
  currentStatus,
  currentAssigneeId,
  members,
  canUpdate,
  canAssign,
}: TicketDetailControlsProps) {
  const t = useTranslations("Tickets");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (status: TicketStatus) => {
    startTransition(async () => {
      const res = await updateTicketStatusAction({
        tenantSlug,
        ticketId,
        status,
        locale,
      });

      if (res.success) {
        toast.success(t("statusUpdatedSuccess"));
      } else {
        toast.error(res.error || t("statusUpdateError"));
      }
    });
  };

  const handleAssigneeChange = (membershipId: string) => {
    startTransition(async () => {
      const target = membershipId === "NONE" ? null : membershipId;
      const res = await assignTicketAction({
        tenantSlug,
        ticketId,
        assigneeMembershipId: target,
        locale,
      });

      if (res.success) {
        toast.success(t("assigneeUpdatedSuccess"));
      } else {
        toast.error(res.error || t("assigneeUpdateError"));
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Quick Status Bar */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">
          {t("statusLabel")}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {statusOptions.map((status) => {
            const isSelected = currentStatus === status;
            return (
              <button
                key={status}
                type="button"
                disabled={!canUpdate || isPending}
                onClick={() => handleStatusChange(status)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-border/80 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t(`statuses.${status}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Assignee Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">
          {t("assigneeLabel")}
        </label>
        <select
          value={currentAssigneeId || "NONE"}
          disabled={!canAssign || isPending}
          onChange={(e) => handleAssigneeChange(e.target.value)}
          aria-label={t("assigneeLabel")}
          className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
        >
          <option value="NONE">{t("unassigned")}</option>
          {members.map((m) => (
            <option key={m.membershipId} value={m.membershipId}>
              {m.name || m.email} ({m.role})
            </option>
          ))}
        </select>
      </div>

      {/* Fast Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        {currentStatus !== "RESOLVED" && currentStatus !== "CLOSED" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canUpdate || isPending}
            onClick={() => handleStatusChange("RESOLVED")}
            className="flex-1 gap-1.5 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 dark:text-emerald-400"
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
            {t("markResolved")}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canUpdate || isPending}
            onClick={() => handleStatusChange("IN_PROGRESS")}
            className="flex-1 gap-1.5 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10 dark:text-amber-400"
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RotateCcw className="size-3.5" />
            )}
            {t("reopenTicket")}
          </Button>
        )}
      </div>
    </div>
  );
}
