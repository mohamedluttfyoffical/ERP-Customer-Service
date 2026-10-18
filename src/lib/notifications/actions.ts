"use server";

import { revalidatePath } from "next/cache";
import { type NotificationType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getTenantAccess } from "@/lib/tenants/context";
import { broadcastTenantEvent } from "@/lib/realtime/pusher";

export interface UserNotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export type NotificationActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

/**
 * Returns latest notifications for the current authenticated user inside the tenant.
 */
export async function getUserNotificationsAction(params: {
  tenantSlug: string;
  locale: string;
}): Promise<{
  notifications: UserNotificationItem[];
  unreadCount: number;
}> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    const records = await prisma.notification.findMany({
      where: {
        userId: access.user.id,
        OR: [{ tenantId: access.tenant.id }, { tenantId: null }],
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        href: true,
        readAt: true,
        createdAt: true,
      },
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: access.user.id,
        readAt: null,
        OR: [{ tenantId: access.tenant.id }, { tenantId: null }],
      },
    });

    return {
      notifications: records.map((n) => ({
        ...n,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    };
  } catch {
    return {
      notifications: [],
      unreadCount: 0,
    };
  }
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationAsReadAction(params: {
  tenantSlug: string;
  notificationId: string;
  locale: string;
}): Promise<NotificationActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    await prisma.notification.updateMany({
      where: {
        id: params.notificationId,
        userId: access.user.id,
      },
      data: {
        readAt: new Date(),
      },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}`);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update notification.",
    };
  }
}

/**
 * Marks all notifications as read for current user.
 */
export async function markAllNotificationsAsReadAction(params: {
  tenantSlug: string;
  locale: string;
}): Promise<NotificationActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    await prisma.notification.updateMany({
      where: {
        userId: access.user.id,
        readAt: null,
        OR: [{ tenantId: access.tenant.id }, { tenantId: null }],
      },
      data: {
        readAt: new Date(),
      },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}`);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to mark all as read.",
    };
  }
}

/**
 * Internal helper to create and broadcast a new in-app notification.
 */
export async function createTenantNotification(params: {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  href?: string | null;
  data?: Prisma.InputJsonValue;
}): Promise<string> {
  const notification = await prisma.notification.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      href: params.href ?? null,
      data: params.data,
    },
  });

  // Broadcast to user's real-time notification channel
  await broadcastTenantEvent({
    tenantId: params.tenantId,
    channel: `user-${params.userId}`,
    event: "notification-created",
    data: {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      href: notification.href,
      createdAt: notification.createdAt.toISOString(),
    },
  });

  return notification.id;
}
