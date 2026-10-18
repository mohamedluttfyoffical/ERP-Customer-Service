import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Plus,
  ShieldCheck,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { CustomerChatWidget } from "@/components/chat/customer-chat-widget";

interface PortalLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
    tenantSlug: string;
  }>;
}

export default async function PortalLayout(props: PortalLayoutProps) {
  const { tenantSlug } = await props.params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
    },
  });

  if (!tenant || tenant.status === "CANCELED" || tenant.status === "SUSPENDED") {
    notFound();
  }

  const t = await getTranslations("Portal");

  return (
    <div className="min-h-screen flex flex-col bg-muted/15 text-foreground">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Brand & Portal Badge */}
          <div className="flex items-center gap-3">
            <Link
              href={`/portal/${tenantSlug}`}
              className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                {tenant.name.charAt(0)}
              </span>
              <div>
                <span className="font-bold text-sm sm:text-base leading-tight block">
                  {tenant.name}
                </span>
                <span className="text-[10px] text-muted-foreground block font-medium">
                  {t("portalBadge")}
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-muted-foreground">
            <Link
              href={`/portal/${tenantSlug}`}
              className="transition-colors hover:text-foreground"
            >
              {t("nav.home")}
            </Link>
            <Link
              href={`/portal/${tenantSlug}/kb`}
              className="transition-colors hover:text-foreground"
            >
              {t("nav.kb")}
            </Link>
            <Link
              href={`/portal/${tenantSlug}/tickets`}
              className="transition-colors hover:text-foreground"
            >
              {t("nav.tickets")}
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <LocaleSwitcher />
            <Link
              href={`/portal/${tenantSlug}/tickets/new`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition-opacity hover:opacity-90"
            >
              <Plus className="size-3.5" />
              <span>{t("nav.submitTicket")}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{props.children}</main>

      {/* Footer */}
      <footer className="border-t border-border/70 bg-card py-6 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            © {new Date().getFullYear()} {tenant.name}. {t("footer.rights")}
          </span>
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>{t("footer.poweredBy")}</span>
          </div>
        </div>
      </footer>

      {/* Live Chat Widget */}
      <CustomerChatWidget tenantSlug={tenantSlug} tenantName={tenant.name} />
    </div>
  );
}
