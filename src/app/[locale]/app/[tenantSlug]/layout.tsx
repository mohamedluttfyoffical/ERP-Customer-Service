import { setRequestLocale } from "next-intl/server";

import { TenantBlocked } from "@/components/workspace/tenant-blocked";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { prisma } from "@/lib/db";
import { getTenantAccess, canEnterWorkspace, hasTenantPermission } from "@/lib/tenants/context";
import { localizePlan, localizeRole, trialDaysLeft } from "@/lib/tenants/presentation";

type TenantLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string; tenantSlug: string }>;
};

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { locale, tenantSlug } = await params;
  setRequestLocale(locale);

  const access = await getTenantAccess(locale, tenantSlug);

  if (!canEnterWorkspace(access.tenant.status)) {
    return <TenantBlocked status={access.tenant.status} locale={locale} />;
  }

  const subscription = await prisma.subscription.findFirst({
    where: { tenantId: access.tenant.id },
    orderBy: { createdAt: "desc" },
    select: {
      status: true,
      interval: true,
      plan: { select: { nameAr: true, nameEn: true } },
    },
  });

  const roleLabel = localizeRole({ key: access.role.key, name: access.role.name }, locale);
  const planName = localizePlan(subscription?.plan, locale);
  const daysLeft =
    access.tenant.status === "TRIALING" ? trialDaysLeft(access.tenant.trialEndsAt) : null;

  return (
    <WorkspaceShell
      tenant={{
        name: access.tenant.name,
        slug: access.tenant.slug,
        trialDaysLeft: daysLeft,
      }}
      user={{
        name: access.user.name ?? access.user.email,
        email: access.user.email,
      }}
      roleLabel={roleLabel}
      planName={planName}
      canAccessTeam={hasTenantPermission(access, "member:read")}
      canAccessSettings={hasTenantPermission(access, "setting:read")}
      isPlatformAdmin={access.user.platformRole === "SUPER_ADMIN"}
    >
      {children}
    </WorkspaceShell>
  );
}
