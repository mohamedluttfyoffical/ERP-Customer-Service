"use server";

import { revalidatePath } from "next/cache";
import { type TicketPriority } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertUsageLimit } from "@/lib/billing/gating";
import { calculateTicketSlaDueDates } from "@/lib/tickets/sla";

export type PortalActionResult =
  | { success: true; ticketNumber?: number; message?: string }
  | { success: false; error: string };

export async function submitPortalTicketAction(params: {
  tenantSlug: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  description: string;
  priority?: TicketPriority;
  locale: string;
}): Promise<PortalActionResult> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.tenantSlug },
      select: { id: true, status: true },
    });

    if (!tenant) {
      return { success: false, error: "Tenant not found." };
    }

    if (tenant.status !== "ACTIVE" && tenant.status !== "TRIALING") {
      return {
        success: false,
        error: "This portal is currently unavailable.",
      };
    }

    // Check tenant's monthly tickets quota
    await assertUsageLimit(tenant.id, "TICKETS_PER_MONTH", 1);

    const email = params.email.trim().toLowerCase();
    const name = params.name.trim();

    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: {
        tenantId: tenant.id,
        email,
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          tenantId: tenant.id,
          name,
          email,
          phone: params.phone?.trim() || null,
          type: "INDIVIDUAL",
          status: "ACTIVE",
        },
      });
    }

    // Find or create contact
    let contact = await prisma.customerContact.findFirst({
      where: {
        tenantId: tenant.id,
        customerId: customer.id,
        email,
      },
    });

    if (!contact) {
      const parts = name.split(/\s+/);
      const firstName = parts[0] || name;
      const lastName = parts.slice(1).join(" ") || "—";

      contact = await prisma.customerContact.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          firstName,
          lastName,
          email,
          phone: params.phone?.trim() || null,
          isPrimary: true,
        },
      });
    }

    const priority = params.priority ?? "MEDIUM";
    const sla = await calculateTicketSlaDueDates(tenant.id, priority);

    // Atomically increment ticket sequence
    const sequence = await prisma.sequence.upsert({
      where: {
        tenantId_key: {
          tenantId: tenant.id,
          key: "ticket",
        },
      },
      create: {
        tenantId: tenant.id,
        key: "ticket",
        value: 1001,
      },
      update: {
        value: { increment: 1 },
      },
    });

    const ticketNumber = sequence.value;

    await prisma.ticket.create({
      data: {
        tenantId: tenant.id,
        number: ticketNumber,
        subject: params.subject.trim(),
        description: params.description.trim(),
        customerId: customer.id,
        requesterContactId: contact.id,
        priority,
        type: "QUESTION",
        status: "OPEN",
        channel: "PORTAL",
        firstResponseDueAt: sla.firstResponseDueAt,
        resolutionDueAt: sla.resolutionDueAt,
        activities: {
          create: {
            tenantId: tenant.id,
            type: "CREATED",
            metadata: { toStatus: "OPEN", channel: "PORTAL" },
          },
        },
      },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/tickets`);
    revalidatePath(`/${params.locale}/portal/${params.tenantSlug}/tickets`);

    return { success: true, ticketNumber };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to submit ticket.",
    };
  }
}

export async function submitPortalMessageAction(params: {
  tenantSlug: string;
  ticketNumber: number;
  email: string;
  body: string;
  locale: string;
}): Promise<PortalActionResult> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.tenantSlug },
      select: { id: true },
    });

    if (!tenant) {
      return { success: false, error: "Tenant not found." };
    }

    const email = params.email.trim().toLowerCase();

    // Verify ticket belongs to tenant and customer
    const ticket = await prisma.ticket.findFirst({
      where: {
        tenantId: tenant.id,
        number: params.ticketNumber,
        customer: { email },
      },
      include: {
        requester: true,
      },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found or unauthorized." };
    }

    const now = new Date();

    await prisma.ticketMessage.create({
      data: {
        tenantId: tenant.id,
        ticketId: ticket.id,
        senderType: "CUSTOMER",
        senderContactId: ticket.requesterContactId,
        visibility: "PUBLIC",
        channel: "PORTAL",
        body: params.body.trim(),
      },
    });

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        lastMessageAt: now,
        lastCustomerMessageAt: now,
        // If ticket was pending customer, move to in progress
        status:
          ticket.status === "PENDING_CUSTOMER" ? "IN_PROGRESS" : ticket.status,
      },
    });

    revalidatePath(
      `/${params.locale}/portal/${params.tenantSlug}/tickets/${params.ticketNumber}`
    );
    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/tickets/${ticket.id}`);

    return { success: true, ticketNumber: ticket.number };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to post message.",
    };
  }
}
