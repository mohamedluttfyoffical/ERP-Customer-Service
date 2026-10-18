import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Home,
  UserCheck,
  User,
  Lock,
  MessageSquare,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { PortalReplyComposer } from "@/components/portal/portal-reply-composer";
import { formatRelativeTime } from "@/lib/format";
import { type TicketStatus } from "@prisma/client";

interface PortalTicketDetailPageProps {
  params: Promise<{
    locale: string;
    tenantSlug: string;
    ticketNumber: string;
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

export default async function PortalTicketDetailPage(
  props: PortalTicketDetailPageProps
) {
  const { locale, tenantSlug, ticketNumber: ticketNumberStr } = await props.params;
  const search = await props.searchParams;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, name: true, slug: true },
  });

  if (!tenant) {
    notFound();
  }

  const ticketNumber = parseInt(ticketNumberStr, 10);
  if (isNaN(ticketNumber)) {
    notFound();
  }

  const t = await getTranslations("Portal.ticketDetail");
  const emailParam = search.email?.trim().toLowerCase() || "";

  // Query ticket
  const ticket = await prisma.ticket.findFirst({
    where: {
      tenantId: tenant.id,
      number: ticketNumber,
    },
    include: {
      customer: {
        select: { name: true, email: true },
      },
      messages: {
        where: {
          visibility: "PUBLIC", // STRICT ISOLATION: Never leak internal notes to customer!
        },
        include: {
          senderUser: { select: { name: true } },
          senderContact: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  // Security Check: Customer email verification
  const isAuthorized =
    emailParam &&
    ticket.customer.email &&
    emailParam.toLowerCase() === ticket.customer.email.toLowerCase();

  if (!isAuthorized) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary mx-auto">
            <Lock className="size-6" />
          </span>
          <h2 className="text-lg font-bold">{t("verificationTitle")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("verificationDescription", { number: ticket.number })}
          </p>

          <form method="GET" className="space-y-3">
            <input
              type="email"
              name="email"
              required
              placeholder={t("emailVerificationPlaceholder")}
              className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-primary py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity"
            >
              {t("verifyButton")}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
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
        <Link
          href={`/portal/${tenantSlug}/tickets?email=${encodeURIComponent(
            emailParam
          )}`}
          className="hover:text-foreground transition-colors"
        >
          {t("tickets")}
        </Link>
        <span>/</span>
        <span className="font-semibold text-foreground">#{ticket.number}</span>
      </nav>

      {/* Ticket Header Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-muted-foreground">
              #{ticket.number}
            </span>
            <Badge
              variant={statusBadgeVariant[ticket.status]}
              className="text-xs font-semibold"
            >
              {t(`statuses.${ticket.status}`)}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(new Date(ticket.createdAt), locale)}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {ticket.subject}
        </h1>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
          {ticket.description}
        </div>
      </div>

      {/* Public Message Timeline */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <MessageSquare className="size-3.5" />
          <span>{t("conversationThread")} ({ticket.messages.length})</span>
        </div>

        {ticket.messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 p-8 text-center text-xs text-muted-foreground">
            {t("noRepliesYet")}
          </div>
        ) : (
          ticket.messages.map((msg) => {
            const isAgent = msg.senderType === "AGENT";
            const senderName = isAgent
              ? msg.senderUser?.name || t("supportTeam")
              : msg.senderContact
                ? `${msg.senderContact.firstName} ${msg.senderContact.lastName}`.trim()
                : t("you");

            return (
              <div
                key={msg.id}
                className={`rounded-2xl border p-4.5 shadow-xs transition-all ${
                  isAgent
                    ? "border-primary/20 bg-primary/[0.03]"
                    : "border-border/70 bg-card"
                }`}
              >
                <div className="flex items-center justify-between border-b border-border/40 pb-2.5 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`grid size-7 place-items-center rounded-lg text-xs font-semibold ${
                        isAgent
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isAgent ? (
                        <UserCheck className="size-4" />
                      ) : (
                        <User className="size-4" />
                      )}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {senderName}
                    </span>
                    {isAgent && (
                      <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary">
                        {t("agentBadge")}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelativeTime(new Date(msg.createdAt), locale)}
                  </span>
                </div>

                <div className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                  {msg.body}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply Composer for Customer */}
      <PortalReplyComposer
        tenantSlug={tenantSlug}
        ticketNumber={ticket.number}
        email={emailParam}
      />
    </div>
  );
}
