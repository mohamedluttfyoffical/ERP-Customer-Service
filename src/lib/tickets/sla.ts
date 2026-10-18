import { prisma } from "@/lib/db";
import { type TicketPriority } from "@prisma/client";

export interface SlaDueDates {
  firstResponseDueAt: Date;
  resolutionDueAt: Date;
  firstResponseMinutes: number;
  resolutionMinutes: number;
}

export const DEFAULT_SLA_TARGETS: Record<
  TicketPriority,
  { firstResponseMinutes: number; resolutionMinutes: number }
> = {
  URGENT: { firstResponseMinutes: 60, resolutionMinutes: 240 },
  HIGH: { firstResponseMinutes: 120, resolutionMinutes: 480 },
  MEDIUM: { firstResponseMinutes: 240, resolutionMinutes: 1440 },
  LOW: { firstResponseMinutes: 480, resolutionMinutes: 2880 },
};

/**
 * Calculate dynamic SLA first response and resolution due dates for a given priority and tenant.
 */
export async function calculateTicketSlaDueDates(
  tenantId: string,
  priority: TicketPriority,
  startDate = new Date(),
): Promise<SlaDueDates> {
  // Query custom tenant targets if available
  const customTarget = await prisma.slaTarget.findFirst({
    where: {
      tenantId,
      priority,
    },
    select: {
      firstResponseMinutes: true,
      resolutionMinutes: true,
    },
  });

  const config = customTarget ?? DEFAULT_SLA_TARGETS[priority];

  const firstResponseDueAt = new Date(startDate.getTime() + config.firstResponseMinutes * 60 * 1000);
  const resolutionDueAt = new Date(startDate.getTime() + config.resolutionMinutes * 60 * 1000);

  return {
    firstResponseDueAt,
    resolutionDueAt,
    firstResponseMinutes: config.firstResponseMinutes,
    resolutionMinutes: config.resolutionMinutes,
  };
}

export interface SlaRemainingInfo {
  isBreached: boolean;
  breached: boolean;
  minutesRemaining: number;
  label: string;
  text: string;
}

/**
 * Format remaining SLA duration or breach duration cleanly for UI badges.
 */
export function getSlaRemainingInfo(dueDate: Date | null, completedDate?: Date | null): SlaRemainingInfo | null {
  if (!dueDate) {
    return null;
  }

  const compareDate = completedDate ?? new Date();
  const diffMs = dueDate.getTime() - compareDate.getTime();
  const minutes = Math.round(diffMs / (60 * 1000));

  if (minutes < 0) {
    const overdueMins = Math.abs(minutes);
    const hours = Math.floor(overdueMins / 60);
    const remMins = overdueMins % 60;
    const label = hours > 0 ? `+${hours}h ${remMins}m` : `+${overdueMins}m`;
    return {
      isBreached: true,
      breached: true,
      minutesRemaining: minutes,
      label,
      text: label,
    };
  }

  const hours = Math.floor(minutes / 60);
  const remMins = minutes % 60;
  const label = hours > 0 ? `${hours}h ${remMins}m` : `${remMins}m`;

  return {
    isBreached: false,
    breached: false,
    minutesRemaining: minutes,
    label,
    text: label,
  };
}
