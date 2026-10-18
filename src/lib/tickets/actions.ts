"use server";

import { revalidatePath } from "next/cache";
import type {
  TicketPriority,
  TicketStatus,
  TicketType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getTenantAccess, hasTenantPermission } from "@/lib/tenants/context";
import { assertUsageLimit } from "@/lib/billing/gating";
import { calculateTicketSlaDueDates } from "@/lib/tickets/sla";

export type TicketActionResult =
  | { success: true; ticketId?: string; message?: string }
  | { success: false; error: string };

export async function createTicketAction(params: {
  tenantSlug: string;
  subject: string;
  description: string;
  customerId: string;
  departmentId?: string | null;
  priority?: TicketPriority;
  type?: TicketType;
  locale: string;
}): Promise<TicketActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    if (!hasTenantPermission(access, "ticket:create")) {
      return { success: false, error: "Settings.errors.forbidden" };
    }

    // Gating check on monthly tickets quota
    await assertUsageLimit(access.tenant.id, "TICKETS_PER_MONTH", 1);

    const priority = params.priority ?? "MEDIUM";
    const sla = await calculateTicketSlaDueDates(access.tenant.id, priority);

    // Atomically increment ticket sequence
    const sequence = await prisma.sequence.upsert({
      where: {
        tenantId_key: {
          tenantId: access.tenant.id,
          key: "ticket",
        },
      },
      create: {
        tenantId: access.tenant.id,
        key: "ticket",
        value: 1001,
      },
      update: {
        value: { increment: 1 },
      },
    });

    const ticketNumber = sequence.value;

    const ticket = await prisma.ticket.create({
      data: {
        tenantId: access.tenant.id,
        number: ticketNumber,
        subject: params.subject.trim(),
        description: params.description.trim(),
        customerId: params.customerId,
        departmentId: params.departmentId || null,
        priority,
        type: params.type ?? "QUESTION",
        status: "OPEN",
        channel: "PORTAL",
        firstResponseDueAt: sla.firstResponseDueAt,
        resolutionDueAt: sla.resolutionDueAt,
        activities: {
          create: {
            tenantId: access.tenant.id,
            actorMembershipId: access.membership.id,
            type: "CREATED",
            metadata: { toStatus: "OPEN" },
          },
        },
      },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/tickets`);
    revalidatePath(`/${params.locale}/app/${params.tenantSlug}`);

    return { success: true, ticketId: ticket.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create ticket.",
    };
  }
}

export async function updateTicketStatusAction(params: {
  tenantSlug: string;
  ticketId: string;
  status: TicketStatus;
  locale: string;
}): Promise<TicketActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    if (!hasTenantPermission(access, "ticket:update")) {
      return { success: false, error: "Settings.errors.forbidden" };
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id: params.ticketId, tenantId: access.tenant.id },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found." };
    }

    const fromStatus = ticket.status;
    const now = new Date();

    const updateData: Prisma.TicketUpdateInput = {
      status: params.status,
    };

    if (params.status === "RESOLVED") {
      updateData.resolvedAt = now;
    } else if (params.status === "CLOSED") {
      updateData.closedAt = now;
    } else if (fromStatus === "RESOLVED" || fromStatus === "CLOSED") {
      updateData.reopenCount = { increment: 1 };
    }

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: updateData,
    });

    await prisma.ticketActivity.create({
      data: {
        tenantId: access.tenant.id,
        ticketId: ticket.id,
        actorMembershipId: access.membership.id,
        type:
          params.status === "RESOLVED"
            ? "RESOLVED"
            : params.status === "CLOSED"
              ? "CLOSED"
              : "STATUS_CHANGED",
        metadata: {
          fromStatus,
          toStatus: params.status,
        },
      },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/tickets`);
    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/tickets/${ticket.id}`);

    return { success: true, ticketId: ticket.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update ticket status.",
    };
  }
}

export async function assignTicketAction(params: {
  tenantSlug: string;
  ticketId: string;
  assigneeMembershipId: string | null;
  locale: string;
}): Promise<TicketActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    if (!hasTenantPermission(access, "ticket:assign")) {
      return { success: false, error: "Settings.errors.forbidden" };
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id: params.ticketId, tenantId: access.tenant.id },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found." };
    }

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        assigneeMembershipId: params.assigneeMembershipId,
      },
    });

    await prisma.ticketActivity.create({
      data: {
        tenantId: access.tenant.id,
        ticketId: ticket.id,
        actorMembershipId: access.membership.id,
        type: "ASSIGNED",
      },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/tickets`);
    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/tickets/${ticket.id}`);

    return { success: true, ticketId: ticket.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to assign ticket.",
    };
  }
}

export async function createTicketMessageAction(params: {
  tenantSlug: string;
  ticketId: string;
  body: string;
  isInternal: boolean;
  locale: string;
}): Promise<TicketActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    const requiredPermission = params.isInternal ? "ticket:note" : "ticket:update";
    if (!hasTenantPermission(access, requiredPermission)) {
      return { success: false, error: "Settings.errors.forbidden" };
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id: params.ticketId, tenantId: access.tenant.id },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found." };
    }

    const now = new Date();
    const isFirstResponse = !ticket.firstRespondedAt && !params.isInternal;

    await prisma.ticketMessage.create({
      data: {
        tenantId: access.tenant.id,
        ticketId: ticket.id,
        senderType: "AGENT",
        senderUserId: access.user.id,
        visibility: params.isInternal ? "INTERNAL" : "PUBLIC",
        channel: "PORTAL",
        body: params.body.trim(),
      },
    });

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        lastMessageAt: now,
        lastAgentMessageAt: now,
        ...(isFirstResponse ? { firstRespondedAt: now } : {}),
      },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/tickets/${ticket.id}`);

    return { success: true, ticketId: ticket.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to post message.",
    };
  }
}
