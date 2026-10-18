"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import type { ProfileActionState } from "@/lib/auth/action-types";
import { fieldErrorsFromZod, getFormValue } from "@/lib/auth/validation";
import { canEnterWorkspace, getTenantAccess, hasTenantPermission } from "@/lib/tenants/context";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Settings.errors.name").max(200, "Settings.errors.name"),
  supportEmail: z.union([
    z.literal("").transform(() => null),
    z
      .string()
      .trim()
      .toLowerCase()
      .email("Settings.errors.email")
      .max(320, "Settings.errors.email"),
  ]),
  supportPhone: z.union([
    z.literal("").transform(() => null),
    z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{6,32}$/, "Settings.errors.phone")
      .transform((value) => value),
  ]),
});

function normalizeLocale(value: string): "ar" | "en" {
  return value === "en" ? "en" : "ar";
}

export async function updateTenantProfileAction(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const locale = normalizeLocale(getFormValue(formData, "locale"));
  const tenantSlug = getFormValue(formData, "tenantSlug");

  if (!tenantSlug) {
    return { status: "error", message: "Settings.errors.generic" };
  }

  const access = await getTenantAccess(locale, tenantSlug);
  if (!hasTenantPermission(access, "setting:manage")) {
    return { status: "error", message: "Settings.errors.forbidden" };
  }
  if (!canEnterWorkspace(access.tenant.status)) {
    return { status: "error", message: "Settings.errors.generic" };
  }

  const parsed = profileSchema.safeParse({
    name: getFormValue(formData, "name"),
    supportEmail: getFormValue(formData, "supportEmail"),
    supportPhone: getFormValue(formData, "supportPhone"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const before = await prisma.tenant.findUnique({
    where: { id: access.tenant.id },
    select: {
      name: true,
      phone: true,
      settings: { select: { supportEmail: true, supportPhone: true } },
    },
  });

  try {
    await prisma.$transaction([
      prisma.tenant.update({
        where: { id: access.tenant.id },
        data: {
          name: parsed.data.name,
          phone: parsed.data.supportPhone,
        },
      }),
      prisma.tenantSetting.upsert({
        where: { tenantId: access.tenant.id },
        create: {
          tenantId: access.tenant.id,
          supportEmail: parsed.data.supportEmail,
          supportPhone: parsed.data.supportPhone,
        },
        update: {
          supportEmail: parsed.data.supportEmail,
          supportPhone: parsed.data.supportPhone,
        },
      }),
      prisma.auditLog.create({
        data: {
          tenantId: access.tenant.id,
          actorType: "USER",
          actorUserId: access.user.id,
          action: "tenant.profile_updated",
          entityType: "Tenant",
          entityId: access.tenant.id,
          before: before ?? undefined,
          after: {
            name: parsed.data.name,
            phone: parsed.data.supportPhone,
            supportEmail: parsed.data.supportEmail,
          },
        },
      }),
    ]);
  } catch (error) {
    console.error("[settings] profile update failed", error);
    return { status: "error", message: "Settings.errors.generic" };
  }

  return { status: "success", message: "Settings.saved" };
}
