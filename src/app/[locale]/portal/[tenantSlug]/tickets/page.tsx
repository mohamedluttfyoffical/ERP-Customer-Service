import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Search,
  Ticket,
  ArrowRight,
  Home,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/format";
import { type TicketPriority, type TicketStatus } from "@prisma/client";

interface PortalTicketsPageProps {
  params: Promise<{
    locale: string;
    tenantSlug: string;
  }>;
  searchParams: Promise<{
    email?: string;
  }>;
}

const statusBadgeVariant: Record<
  TicketStatus,
  "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
> = {
  OPEN: "default",
  IN_PROGRESS: "warning",
  PENDING_CUSTOMER: "secondary",
  ESCALATED: "destructive",
  RESOLVED: "success",
  CLOSED: "outline",
};

export default async function PortalTicketsPage(props: PortalTicketsPageProps) {
  const { locale, tenantSlug } = await props.params;
  const search = await props.searchParams;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, name: true, slug: true },
  });

  if (!tenant) {
    notFound();
  }

  const t = await getTranslations("Portal.ticketsLookup");
  const emailQuery = search.email?.trim().toLowerCase() || "";

  let tickets: Array<{
    id: string;
    number: number;
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    createdAt: Date;
    lastMessageAt: Date | null;
  }> = [];

  if (emailQuery) {
    tickets = await prisma.ticket.findMany({
      where: {
        tenantId: tenant.id,
        customer: { email: emailQuery },
      },
      select: {
        id: true,
        number: true,
        subject: true,
        status: true,
        priority: true,
        createdAt: true,
        lastMessageAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href={`/portal/${tenantSlug}`}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Home className="size-3.5" />
          <span>{t("home")}</span>
        </Link>
        <span>/</span>
        <span className="font-semibold text-foreground">{t("title")}</span>
      </nav>

      {/* Header and Lookup Form */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <form method="GET" className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <input
            type="email"
            name="email"
            required
            defaultValue={emailQuery}
            placeholder={t("emailPlaceholder")}
            className="flex-1 rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity"
          >
            <Search className="size-3.5" />
            <span>{t("lookupButton")}</span>
          </button>
        </form>
      </div>

      {/* Results Section */}
      {emailQuery && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">
              {t("resultsTitle", { count: tickets.length, email: emailQuery })}
            </h2>
          </div>

          {tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 p-12 text-center">
              <Ticket className="mx-auto size-10 text-muted-foreground/60" />
              <h3 className="mt-3 text-sm font-semibold">{t("emptyTitle")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("emptyDescription")}
              </p>
              <div className="mt-4">
                <Link
                  href={`/portal/${tenantSlug}/tickets/new`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                >
                  <span>{t("submitNewTicket")}</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead className="border-b border-border/70 bg-muted/40 text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-3 px-4 text-start">{t("table.ticket")}</th>
                      <th className="py-3 px-4 text-start">{t("table.status")}</th>
                      <th className="py-3 px-4 text-start">{t("table.created")}</th>
                      <th className="py-3 px-4 text-end">{t("table.action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {tickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="group transition-colors hover:bg-muted/30"
                      >
                        <td className="py-3.5 px-4 font-semibold text-foreground">
                          <Link
                            href={`/portal/${tenantSlug}/tickets/${ticket.number}?email=${encodeURIComponent(
                              emailQuery
                            )}`}
                            className="block hover:text-primary transition-colors"
                          >
                            <span className="font-mono text-[11px] text-muted-foreground block">
                              #{ticket.number}
                            </span>
                            <span>{ticket.subject}</span>
                          </Link>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={statusBadgeVariant[ticket.status]}
                            className="text-[10px]"
                          >
                            {t(`statuses.${ticket.status}`)}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                          {formatRelativeTime(new Date(ticket.createdAt), locale)}
                        </td>
                        <td className="py-3.5 px-4 text-end">
                          <Link
                            href={`/portal/${tenantSlug}/tickets/${ticket.number}?email=${encodeURIComponent(
                              emailQuery
                            )}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
                          >
                            <span>{t("viewConversation")}</span>
                            <ArrowRight className="size-3 ltr:rotate-0 rtl:rotate-180" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
