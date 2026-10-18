"use server";

import { revalidatePath } from "next/cache";
import {
  type ChatSessionStatus,
  type MessageSenderType,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getTenantAccess, hasTenantPermission } from "@/lib/tenants/context";
import { broadcastTenantEvent } from "@/lib/realtime/pusher";
import { calculateTicketSlaDueDates } from "@/lib/tickets/sla";

export interface ChatMessageItem {
  id: string;
  sessionId: string;
  senderType: MessageSenderType;
  senderName?: string;
  body: string;
  createdAt: string;
}

export type ChatActionResult =
  | { success: true; sessionId?: string; messageId?: string; ticketNumber?: number }
  | { success: false; error: string };

/**
 * Customer initiates a live chat session from the portal.
 */
export async function startCustomerChatSessionAction(params: {
  tenantSlug: string;
  visitorName: string;
  visitorEmail: string;
  subject?: string;
  initialMessage: string;
  locale: string;
}): Promise<ChatActionResult> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.tenantSlug },
      select: { id: true, name: true },
    });

    if (!tenant) {
      return { success: false, error: "Tenant not found." };
    }

    const email = params.visitorEmail.toLowerCase().trim();
    const name = params.visitorName.trim();
    const message = params.initialMessage.trim();

    if (!name || !email || !message) {
      return { success: false, error: "Missing required fields." };
    }

    // Lookup existing contact if available
    const contact = await prisma.customerContact.findFirst({
      where: { tenantId: tenant.id, email },
      include: { customer: true },
    });

    const session = await prisma.chatSession.create({
      data: {
        tenantId: tenant.id,
        customerId: contact?.customerId ?? null,
        contactId: contact?.id ?? null,
        visitorName: name,
        visitorEmail: email,
        subject: params.subject?.trim() || null,
        status: "WAITING",
        lastMessageAt: new Date(),
        messages: {
          create: {
            tenantId: tenant.id,
            senderType: "CUSTOMER",
            body: message,
          },
        },
      },
    });

    // Real-time broadcast to all tenant agents on incoming chat channel
    await broadcastTenantEvent({
      tenantId: tenant.id,
      channel: "chat-inbox",
      event: "new-session",
      data: {
        sessionId: session.id,
        visitorName: name,
        visitorEmail: email,
        subject: session.subject,
        message,
        createdAt: session.createdAt.toISOString(),
      },
    });

    return { success: true, sessionId: session.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to start chat session.",
    };
  }
}

/**
 * Sends a message in an existing chat session.
 */
export async function sendChatMessageAction(params: {
  tenantSlug: string;
  sessionId: string;
  body: string;
  senderType: MessageSenderType;
  senderUserId?: string;
  locale: string;
}): Promise<ChatActionResult> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.tenantSlug },
      select: { id: true },
    });

    if (!tenant) {
      return { success: false, error: "Tenant not found." };
    }

    const session = await prisma.chatSession.findFirst({
      where: { id: params.sessionId, tenantId: tenant.id },
    });

    if (!session) {
      return { success: false, error: "Chat session not found." };
    }

    const body = params.body.trim();
    if (!body) {
      return { success: false, error: "Message cannot be empty." };
    }

    const message = await prisma.chatMessage.create({
      data: {
        tenantId: tenant.id,
        sessionId: session.id,
        senderType: params.senderType,
        senderUserId: params.senderUserId || null,
        body,
      },
      include: {
        sender: { select: { name: true } },
      },
    });

    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        lastMessageAt: new Date(),
        status: session.status === "WAITING" && params.senderType === "AGENT" ? "OPEN" : undefined,
      },
    });

    // Real-time broadcast to session channel
    await broadcastTenantEvent({
      tenantId: tenant.id,
      channel: `chat-${session.id}`,
      event: "new-message",
      data: {
        id: message.id,
        sessionId: session.id,
        senderType: message.senderType,
        senderName: message.sender?.name || (message.senderType === "AGENT" ? "Agent" : session.visitorName),
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      },
    });

    return { success: true, messageId: message.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send chat message.",
    };
  }
}

/**
 * Returns all messages for a chat session.
 */
export async function getChatSessionMessagesAction(params: {
  tenantSlug: string;
  sessionId: string;
}): Promise<ChatMessageItem[]> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.tenantSlug },
      select: { id: true },
    });

    if (!tenant) return [];

    const messages = await prisma.chatMessage.findMany({
      where: { tenantId: tenant.id, sessionId: params.sessionId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { name: true } },
      },
    });

    return messages.map((m) => ({
      id: m.id,
      sessionId: m.sessionId,
      senderType: m.senderType,
      senderName: m.sender?.name || undefined,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * Returns chat sessions for support agent inbox.
 */
export async function listTenantChatSessionsAction(params: {
  tenantSlug: string;
  status?: ChatSessionStatus;
  locale: string;
}) {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    const sessions = await prisma.chatSession.findMany({
      where: {
        tenantId: access.tenant.id,
        ...(params.status ? { status: params.status } : {}),
      },
      orderBy: { lastMessageAt: "desc" },
      include: {
        customer: { select: { name: true } },
        assignee: {
          include: { user: { select: { name: true, email: true } } },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      status: s.status,
      visitorName: s.visitorName || s.customer?.name || "Visitor",
      visitorEmail: s.visitorEmail,
      subject: s.subject,
      lastMessage: s.messages[0]?.body || "",
      lastMessageAt: s.lastMessageAt?.toISOString() || s.createdAt.toISOString(),
      assigneeName: s.assignee?.user.name,
      ticketId: s.ticketId,
    }));
  } catch {
    return [];
  }
}

/**
 * Agent claims / assigns a chat session.
 */
export async function assignChatSessionAction(params: {
  tenantSlug: string;
  sessionId: string;
  locale: string;
}): Promise<ChatActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    await prisma.chatSession.updateMany({
      where: { id: params.sessionId, tenantId: access.tenant.id },
      data: {
        assignedMembershipId: access.membership.id,
        status: "ASSIGNED",
      },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/chat`);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to assign session.",
    };
  }
}

/**
 * Closes a chat session.
 */
export async function closeChatSessionAction(params: {
  tenantSlug: string;
  sessionId: string;
  locale: string;
}): Promise<ChatActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    await prisma.chatSession.updateMany({
      where: { id: params.sessionId, tenantId: access.tenant.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
      },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/chat`);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to close session.",
    };
  }
}

/**
 * Converts a chat session into a full support ticket.
 */
export async function convertChatToTicketAction(params: {
  tenantSlug: string;
  sessionId: string;
  locale: string;
}): Promise<ChatActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    if (!hasTenantPermission(access, "ticket:create")) {
      return { success: false, error: "Forbidden." };
    }

    const session = await prisma.chatSession.findFirst({
      where: { id: params.sessionId, tenantId: access.tenant.id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!session) {
      return { success: false, error: "Session not found." };
    }

    if (session.ticketId) {
      return { success: false, error: "Session already converted to ticket." };
    }

    // Generate ticket sequence number
    const sequence = await prisma.sequence.upsert({
      where: { tenantId_key: { tenantId: access.tenant.id, key: "ticket" } },
      update: { value: { increment: 1 } },
      create: { tenantId: access.tenant.id, key: "ticket", value: 1001 },
    });

    const ticketNumber = sequence.value;
    const dueDates = await calculateTicketSlaDueDates(access.tenant.id, "MEDIUM");

    const description = session.messages
      .map((m) => `[${m.senderType}]: ${m.body}`)
      .join("\n\n");

    let customerId = session.customerId;
    if (!customerId) {
      const existingCustomer = session.visitorEmail
        ? await prisma.customer.findFirst({
            where: { tenantId: access.tenant.id, email: session.visitorEmail },
          })
        : null;

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const newCustomer = await prisma.customer.create({
          data: {
            tenantId: access.tenant.id,
            name: session.visitorName || "Chat Visitor",
            email: session.visitorEmail || null,
            status: "ACTIVE",
          },
        });
        customerId = newCustomer.id;
      }
    }

    const ticket = await prisma.ticket.create({
      data: {
        tenantId: access.tenant.id,
        number: ticketNumber,
        subject: session.subject || `Live Chat conversation with ${session.visitorName || "Customer"}`,
        description: description || "Transferred from Live Chat session.",
        channel: "CHAT",
        priority: "MEDIUM",
        status: "OPEN",
        customerId,
        requesterContactId: session.contactId || undefined,
        firstResponseDueAt: dueDates.firstResponseDueAt,
        resolutionDueAt: dueDates.resolutionDueAt,
      },
    });

    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        customerId,
        ticketId: ticket.id,
        status: "CLOSED",
        closedAt: new Date(),
      },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/chat`);
    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/tickets`);

    return { success: true, ticketNumber: ticket.number };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to convert chat to ticket.",
    };
  }
}
