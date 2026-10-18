"use client";

import { useTranslations } from "next-intl";
import { Activity, Building2, Layers, ShieldAlert } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function PlatformNav() {
  const t = useTranslations("Platform.nav");
  const pathname = usePathname();

  const links = [
    { href: "/platform", label: t("overview"), icon: Activity, exact: true },
    { href: "/platform/tenants", label: t("tenants"), icon: Building2, exact: false },
    { href: "/platform/plans", label: t("plans"), icon: Layers, exact: false },
    { href: "/platform/audit", label: t("audit"), icon: ShieldAlert, exact: false },
  ];

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-border/60 pb-3 mb-6">
      {links.map((link) => {
        const isActive = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap",
              isActive
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <link.icon className="size-3.5" />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
