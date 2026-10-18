import type { RoleKey } from "@prisma/client";

import { SYSTEM_ROLES } from "@/lib/permissions";

export function localizeRole(role: { key: RoleKey; name: string }, locale: string): string {
  if (role.key === "CUSTOM") {
    return role.name;
  }
  const meta = SYSTEM_ROLES[role.key];
  return locale === "ar" ? meta.nameAr : meta.nameEn;
}

export function localizePlan(
  plan: { nameAr: string; nameEn: string } | null | undefined,
  locale: string,
): string {
  if (!plan) {
    return "—";
  }
  return locale === "ar" ? plan.nameAr : plan.nameEn;
}

export function trialDaysLeft(trialEndsAt: Date | null): number | null {
  if (!trialEndsAt) {
    return null;
  }
  const diff = trialEndsAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}
