"use server";

import { revalidatePath } from "next/cache";
import { type CustomerType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getTenantAccess, hasTenantPermission } from "@/lib/tenants/context";
import { assertUsageLimit } from "@/lib/billing/gating";

export type CrmActionResult =
  | { success: true; customerId?: string; message?: string }
  | { success: false; error: string };

export async function createCustomerAction(params: {
  tenantSlug: string;
  name: string;
  type: CustomerType;
  email?: string | null;
  phone?: string | null;
  industry?: string | null;
  city?: string | null;
  locale: string;
}): Promise<CrmActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    if (!hasTenantPermission(access, "customer:create")) {
      return { success: false, error: "Settings.errors.forbidden" };
    }

    // Check active customer quota
    await assertUsageLimit(access.tenant.id, "MONTHLY_ACTIVE_CUSTOMERS", 1);

    const customer = await prisma.customer.create({
      data: {
        tenantId: access.tenant.id,
        name: params.name.trim(),
        type: params.type,
        email: params.email?.trim() || null,
        phone: params.phone?.trim() || null,
        industry: params.industry?.trim() || null,
        city: params.city?.trim() || null,
        status: "ACTIVE",
      },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/crm`);
    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/tickets`);

    return { success: true, customerId: customer.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create customer.",
    };
  }
}
