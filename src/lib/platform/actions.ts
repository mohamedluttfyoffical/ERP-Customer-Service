"use server";

import { revalidatePath } from "next/cache";
import { type PlanStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/session";

export type PlatformActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

export async function suspendTenantAction(params: {
  tenantId: string;
  reason?: string;
  locale: string;
}): Promise<PlatformActionResult> {
  try {
    const admin = await requireSuperAdmin(params.locale);

    const tenant = await prisma.tenant.findUnique({ where: { id: params.tenantId } });
    if (!tenant) {
      return { success: false, error: "Tenant not found." };
    }

    await prisma.tenant.update({
      where: { id: params.tenantId },
      data: {
        status: "SUSPENDED",
        suspendedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        actorUserId: admin.id,
        actorType: "USER",
        action: "tenant.suspended",
        entityType: "Tenant",
        entityId: params.tenantId,
        after: {
          reason: params.reason || "Suspended by Super Admin",
          suspendedBy: admin.email,
        },
      },
    });

    revalidatePath(`/${params.locale}/platform`);
    revalidatePath(`/${params.locale}/platform/tenants`);

    return { success: true, message: "Tenant suspended successfully." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to suspend tenant.",
    };
  }
}

export async function activateTenantAction(params: {
  tenantId: string;
  locale: string;
}): Promise<PlatformActionResult> {
  try {
    const admin = await requireSuperAdmin(params.locale);

    const tenant = await prisma.tenant.findUnique({ where: { id: params.tenantId } });
    if (!tenant) {
      return { success: false, error: "Tenant not found." };
    }

    await prisma.tenant.update({
      where: { id: params.tenantId },
      data: {
        status: "ACTIVE",
        suspendedAt: null,
        activatedAt: tenant.activatedAt ?? new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        actorUserId: admin.id,
        actorType: "USER",
        action: "tenant.activated",
        entityType: "Tenant",
        entityId: params.tenantId,
        after: {
          activatedBy: admin.email,
        },
      },
    });

    revalidatePath(`/${params.locale}/platform`);
    revalidatePath(`/${params.locale}/platform/tenants`);

    return { success: true, message: "Tenant activated successfully." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to activate tenant.",
    };
  }
}

export async function togglePlanStatusAction(params: {
  planId: string;
  status: PlanStatus;
  locale: string;
}): Promise<PlatformActionResult> {
  try {
    const admin = await requireSuperAdmin(params.locale);

    await prisma.plan.update({
      where: { id: params.planId },
      data: { status: params.status },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: admin.id,
        actorType: "USER",
        action: "plan.status_updated",
        entityType: "Plan",
        entityId: params.planId,
        after: { newStatus: params.status },
      },
    });

    revalidatePath(`/${params.locale}/platform`);
    revalidatePath(`/${params.locale}/platform/plans`);

    return { success: true, message: "Plan status updated successfully." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update plan status.",
    };
  }
}
