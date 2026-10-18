import { cache } from "react";
import { notFound } from "next/navigation";
import type { TenantStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireUser, type SessionUser } from "@/lib/auth/session";
import { isPermission, type Permission, type StaffRoleKey } from "@/lib/permissions";

export type TenantAccess = {
  user: SessionUser;
  tenant: {
    id: string;
    slug: string;
    name: string;
    status: TenantStatus;
    defaultLocale: "AR" | "EN";
    timezone: string;
    currency: string;
    trialEndsAt: Date | null;
    createdAt: Date;
  };
  membership: {
    id: string;
    title: string | null;
    joinedAt: Date | null;
  };
  role: {
    id: string;
    key: StaffRoleKey | "CUSTOM";
    name: string;
    slug: string;
    permissions: Permission[];
  };
};

export class ForbiddenError extends Error {
  constructor(public readonly permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = "ForbiddenError";
  }
}

export const getTenantAccess = cache(
  async (locale: string, tenantSlug: string): Promise<TenantAccess> => {
    const user = await requireUser(locale);

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        defaultLocale: true,
        timezone: true,
        currency: true,
        trialEndsAt: true,
        createdAt: true,
        memberships: {
          where: { userId: user.id, status: "ACTIVE" },
          select: {
            id: true,
            title: true,
            joinedAt: true,
            role: {
              select: {
                id: true,
                key: true,
                name: true,
                slug: true,
                permissions: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    const membership = tenant?.memberships[0];
    if (!tenant || !membership) {
      notFound();
    }

    const permissions = membership.role.permissions.filter(isPermission);

    return {
      user,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        defaultLocale: tenant.defaultLocale,
        timezone: tenant.timezone,
        currency: tenant.currency,
        trialEndsAt: tenant.trialEndsAt,
        createdAt: tenant.createdAt,
      },
      membership: {
        id: membership.id,
        title: membership.title,
        joinedAt: membership.joinedAt,
      },
      role: {
        id: membership.role.id,
        key: membership.role.key,
        name: membership.role.name,
        slug: membership.role.slug,
        permissions,
      },
    };
  },
);

export function hasTenantPermission(access: TenantAccess, permission: Permission): boolean {
  return access.role.permissions.includes(permission);
}

export async function requireTenantPermission(
  locale: string,
  tenantSlug: string,
  permission: Permission,
): Promise<TenantAccess> {
  const access = await getTenantAccess(locale, tenantSlug);
  if (!hasTenantPermission(access, permission)) {
    throw new ForbiddenError(permission);
  }
  return access;
}

export const getUserWorkspaces = cache(async (userId: string) => {
  return prisma.membership.findMany({
    where: {
      userId,
      status: "ACTIVE",
      tenant: {
        status: {
          in: ["TRIALING", "ACTIVE", "PAST_DUE", "SUSPENDED"],
        },
      },
    },
    select: {
      id: true,
      title: true,
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          trialEndsAt: true,
        },
      },
      role: {
        select: {
          key: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: { tenant: { createdAt: "asc" } },
  });
});

export function canEnterWorkspace(status: TenantStatus): boolean {
  return status === "TRIALING" || status === "ACTIVE" || status === "PAST_DUE";
}
