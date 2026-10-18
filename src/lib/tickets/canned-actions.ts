"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getTenantAccess, hasTenantPermission } from "@/lib/tenants/context";

export interface CannedResponseItem {
  id: string;
  shortcut: string;
  title: string;
  body: string;
}

export type CannedActionResult =
  | { success: true; entityId?: string }
  | { success: false; error: string };

/**
 * Returns all saved canned responses for the tenant.
 */
export async function listCannedResponsesAction(params: {
  tenantSlug: string;
  locale: string;
}): Promise<CannedResponseItem[]> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    const items = await prisma.cannedResponse.findMany({
      where: { tenantId: access.tenant.id, isActive: true },
      orderBy: { shortcut: "asc" },
      select: {
        id: true,
        shortcut: true,
        title: true,
        body: true,
      },
    });

    return items;
  } catch {
    return [];
  }
}

/**
 * Creates a new canned response.
 */
export async function createCannedResponseAction(params: {
  tenantSlug: string;
  shortcut: string;
  title: string;
  body: string;
  locale: string;
}): Promise<CannedActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    if (!hasTenantPermission(access, "ticket:update")) {
      return { success: false, error: "Settings.errors.forbidden" };
    }

    const shortcut = params.shortcut.trim().toLowerCase().replace(/^\/+/, "");
    if (!shortcut || !params.title.trim() || !params.body.trim()) {
      return { success: false, error: "Missing required fields." };
    }

    const existing = await prisma.cannedResponse.findUnique({
      where: {
        tenantId_shortcut: {
          tenantId: access.tenant.id,
          shortcut,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Shortcut already exists." };
    }

    const created = await prisma.cannedResponse.create({
      data: {
        tenantId: access.tenant.id,
        shortcut,
        title: params.title.trim(),
        body: params.body.trim(),
        createdByUserId: access.user.id,
      },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/tickets`);
    return { success: true, entityId: created.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create canned response.",
    };
  }
}

/**
 * Deletes a canned response.
 */
export async function deleteCannedResponseAction(params: {
  tenantSlug: string;
  cannedResponseId: string;
  locale: string;
}): Promise<CannedActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    if (!hasTenantPermission(access, "ticket:update")) {
      return { success: false, error: "Settings.errors.forbidden" };
    }

    await prisma.cannedResponse.deleteMany({
      where: { id: params.cannedResponseId, tenantId: access.tenant.id },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/tickets`);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete canned response.",
    };
  }
}
