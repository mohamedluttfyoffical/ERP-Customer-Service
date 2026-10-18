"use server";

import { revalidatePath } from "next/cache";
import { type WorkOrderType, type TicketPriority, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getTenantAccess, hasTenantPermission } from "@/lib/tenants/context";
import { assertFeatureEntitlement } from "@/lib/billing/gating";

export type OperationActionResult =
  | { success: true; entityId?: string; message?: string }
  | { success: false; error: string };

export async function createAssetAction(params: {
  tenantSlug: string;
  customerId: string;
  name: string;
  serialNumber?: string | null;
  location?: string | null;
  locale: string;
}): Promise<OperationActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    if (!hasTenantPermission(access, "asset:manage")) {
      return { success: false, error: "Settings.errors.forbidden" };
    }

    await assertFeatureEntitlement(access.tenant.id, "work_orders_assets");

    const asset = await prisma.asset.create({
      data: {
        tenantId: access.tenant.id,
        customerId: params.customerId,
        name: params.name.trim(),
        serialNumber: params.serialNumber?.trim() || null,
        location: params.location?.trim() || null,
        status: "ACTIVE",
      },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/operations`);
    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/crm`);

    return { success: true, entityId: asset.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create asset.",
    };
  }
}

export async function createWorkOrderAction(params: {
  tenantSlug: string;
  customerId: string;
  ticketId?: string | null;
  assetId?: string | null;
  title: string;
  description?: string | null;
  type?: WorkOrderType;
  priority?: TicketPriority;
  locale: string;
}): Promise<OperationActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    if (!hasTenantPermission(access, "work-order:manage")) {
      return { success: false, error: "Settings.errors.forbidden" };
    }

    await assertFeatureEntitlement(access.tenant.id, "work_orders_assets");

    const sequence = await prisma.sequence.upsert({
      where: {
        tenantId_key: {
          tenantId: access.tenant.id,
          key: "work_order",
        },
      },
      create: {
        tenantId: access.tenant.id,
        key: "work_order",
        value: 1001,
      },
      update: {
        value: { increment: 1 },
      },
    });

    const workOrderNumber = `WO-${sequence.value}`;

    const workOrder = await prisma.workOrder.create({
      data: {
        tenantId: access.tenant.id,
        number: workOrderNumber,
        customerId: params.customerId,
        ticketId: params.ticketId || null,
        assetId: params.assetId || null,
        title: params.title.trim(),
        description: params.description?.trim() || null,
        type: params.type ?? "CORRECTIVE_MAINTENANCE",
        priority: params.priority ?? "MEDIUM",
        status: "DRAFT",
      },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/operations`);
    if (params.ticketId) {
      revalidatePath(`/${params.locale}/app/${params.tenantSlug}/tickets/${params.ticketId}`);
    }

    return { success: true, entityId: workOrder.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create work order.",
    };
  }
}

export async function createQuotationAction(params: {
  tenantSlug: string;
  customerId: string;
  ticketId?: string | null;
  workOrderId?: string | null;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  locale: string;
}): Promise<OperationActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    if (!hasTenantPermission(access, "quotation:manage")) {
      return { success: false, error: "Settings.errors.forbidden" };
    }

    await assertFeatureEntitlement(access.tenant.id, "work_orders_assets");

    const sequence = await prisma.sequence.upsert({
      where: {
        tenantId_key: {
          tenantId: access.tenant.id,
          key: "quotation",
        },
      },
      create: {
        tenantId: access.tenant.id,
        key: "quotation",
        value: 1001,
      },
      update: {
        value: { increment: 1 },
      },
    });

    const quoteNumber = `QT-${sequence.value}`;

    let subtotal = 0;
    const itemsData = params.items.map((it) => {
      const lineTotal = it.quantity * it.unitPrice;
      subtotal += lineTotal;
      return {
        tenantId: access.tenant.id,
        description: it.description,
        quantity: it.quantity,
        unitPrice: new Prisma.Decimal(it.unitPrice),
        total: new Prisma.Decimal(lineTotal),
      };
    });

    const quotation = await prisma.quotation.create({
      data: {
        tenantId: access.tenant.id,
        number: quoteNumber,
        customerId: params.customerId,
        ticketId: params.ticketId || null,
        workOrderId: params.workOrderId || null,
        subtotal: new Prisma.Decimal(subtotal),
        total: new Prisma.Decimal(subtotal),
        status: "DRAFT",
        items: {
          create: itemsData,
        },
      },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/operations`);
    if (params.ticketId) {
      revalidatePath(`/${params.locale}/app/${params.tenantSlug}/tickets/${params.ticketId}`);
    }

    return { success: true, entityId: quotation.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create quotation.",
    };
  }
}
