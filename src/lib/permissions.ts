/**
 * RBAC contract shared by server actions, route handlers and navigation.
 *
 * Permission strings are persisted on `Role.permissions` (string[]) so tenants
 * can create custom roles without a schema migration. Every string must be in
 * PERMISSIONS; the Phase 2 role service validates custom roles against this
 * list before saving.
 */

export const PERMISSIONS = [
  "tenant:read",
  "tenant:update",
  "tenant:delete",
  "tenant:transfer",
  "billing:read",
  "billing:manage",
  "member:read",
  "member:invite",
  "member:update",
  "member:remove",
  "role:read",
  "role:manage",
  "department:read",
  "department:manage",
  "sla:read",
  "sla:manage",
  "custom-field:read",
  "custom-field:manage",
  "ticket:read",
  "ticket:read_all",
  "ticket:create",
  "ticket:update",
  "ticket:assign",
  "ticket:delete",
  "ticket:note",
  "ticket:export",
  "customer:read",
  "customer:create",
  "customer:update",
  "customer:delete",
  "asset:read",
  "asset:manage",
  "work-order:read",
  "work-order:manage",
  "quotation:read",
  "quotation:manage",
  "invoice:read",
  "invoice:manage",
  "spare-part:read",
  "spare-part:manage",
  "kb:read",
  "kb:write",
  "kb:publish",
  "canned-response:read",
  "canned-response:manage",
  "tag:manage",
  "analytics:read",
  "audit:read",
  "setting:read",
  "setting:manage",
  "chat:read",
  "chat:join",
  "chat:close",
  "integration:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type StaffRoleKey = "OWNER" | "ADMIN" | "AGENT" | "TECHNICIAN" | "BILLING";

export const SYSTEM_ROLES: Record<
  StaffRoleKey,
  { nameAr: string; nameEn: string; descriptionAr: string; descriptionEn: string }
> = {
  OWNER: {
    nameAr: "مالك الشركة",
    nameEn: "Owner",
    descriptionAr: "صلاحيات كاملة على مساحة العمل والفواتير والإعدادات.",
    descriptionEn: "Full control over the workspace, billing and settings.",
  },
  ADMIN: {
    nameAr: "مدير الدعم",
    nameEn: "Support administrator",
    descriptionAr: "إدارة الفريق والتذاكر وسياسات SLA دون نقل ملكية الحساب.",
    descriptionEn: "Manages the team, tickets and SLA policies without ownership transfer.",
  },
  AGENT: {
    nameAr: "وكيل دعم",
    nameEn: "Support agent",
    descriptionAr: "معالجة التذاكر والرد على العملاء والمحادثات المباشرة.",
    descriptionEn: "Handles tickets, customer replies and live conversations.",
  },
  TECHNICIAN: {
    nameAr: "فني صيانة",
    nameEn: "Technician",
    descriptionAr: "أوامر العمل والأصول والصيانة وطلبات قطع الغيار.",
    descriptionEn: "Work orders, assets, maintenance and spare-part requests.",
  },
  BILLING: {
    nameAr: "مسؤول الفواتير",
    nameEn: "Billing manager",
    descriptionAr: "إدارة الاشتراك وفواتير الخدمة دون الوصول للتذاكر الداخلية.",
    descriptionEn: "Manages subscriptions and service invoices without internal-ticket access.",
  },
};

const ALL_PERMISSIONS = [...PERMISSIONS] as Permission[];

export const SYSTEM_ROLE_PERMISSIONS: Record<StaffRoleKey, readonly Permission[]> = {
  OWNER: ALL_PERMISSIONS,
  ADMIN: ALL_PERMISSIONS.filter(
    (permission) => permission !== "tenant:delete" && permission !== "tenant:transfer",
  ),
  AGENT: [
    "tenant:read",
    "member:read",
    "role:read",
    "department:read",
    "sla:read",
    "custom-field:read",
    "ticket:read",
    "ticket:create",
    "ticket:update",
    "ticket:assign",
    "ticket:note",
    "ticket:export",
    "customer:read",
    "customer:create",
    "customer:update",
    "asset:read",
    "work-order:read",
    "quotation:read",
    "invoice:read",
    "kb:read",
    "kb:write",
    "canned-response:read",
    "analytics:read",
    "chat:read",
    "chat:join",
    "chat:close",
  ],
  TECHNICIAN: [
    "tenant:read",
    "member:read",
    "department:read",
    "ticket:read",
    "ticket:update",
    "ticket:note",
    "customer:read",
    "asset:read",
    "asset:manage",
    "work-order:read",
    "work-order:manage",
    "quotation:read",
    "invoice:read",
    "spare-part:read",
    "spare-part:manage",
    "kb:read",
    "analytics:read",
    "chat:read",
    "chat:join",
  ],
  BILLING: [
    "tenant:read",
    "billing:read",
    "billing:manage",
    "member:read",
    "customer:read",
    "ticket:read",
    "ticket:read_all",
    "quotation:read",
    "invoice:read",
    "invoice:manage",
    "analytics:read",
  ],
};

const PERMISSION_SET = new Set<string>(PERMISSIONS);

export function isPermission(value: string): value is Permission {
  return PERMISSION_SET.has(value);
}

export function permissionsForRole(
  roleKey: StaffRoleKey | "CUSTOM",
  customPermissions: readonly string[] = [],
): Permission[] {
  if (roleKey === "CUSTOM") {
    return customPermissions.filter(isPermission);
  }
  return [...SYSTEM_ROLE_PERMISSIONS[roleKey]];
}

/**
 * `ticket:read_all` intentionally does not imply `ticket:read`; callers check
 * either the broad scope or the assigned scope. This keeps the permission
 * grant explicit and avoids accidental cross-team visibility.
 */
export function hasPermission(
  permission: Permission,
  options: {
    roleKey: StaffRoleKey | "CUSTOM";
    customPermissions?: readonly string[];
    isSuperAdmin?: boolean;
  },
): boolean {
  if (options.isSuperAdmin) {
    return true;
  }
  return permissionsForRole(options.roleKey, options.customPermissions).includes(permission);
}

export function hasAnyPermission(
  required: readonly Permission[],
  options: {
    roleKey: StaffRoleKey | "CUSTOM";
    customPermissions?: readonly string[];
    isSuperAdmin?: boolean;
  },
): boolean {
  return required.some((permission) => hasPermission(permission, options));
}

export function hasAllPermissions(
  required: readonly Permission[],
  options: {
    roleKey: StaffRoleKey | "CUSTOM";
    customPermissions?: readonly string[];
    isSuperAdmin?: boolean;
  },
): boolean {
  return required.every((permission) => hasPermission(permission, options));
}
