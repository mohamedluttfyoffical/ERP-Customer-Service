import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MessageSquare } from "lucide-react";
import { getTenantAccess, hasTenantPermission } from "@/lib/tenants/context";
import { listTenantChatSessionsAction } from "@/lib/chat/actions";
import { AgentChatWorkspace, type ChatSessionSummary } from "@/components/chat/agent-chat-workspace";

interface ChatPageProps {
  params: Promise<{
    locale: string;
    tenantSlug: string;
  }>;
}

export default async function ChatPage(props: ChatPageProps) {
  const { locale, tenantSlug } = await props.params;

  const access = await getTenantAccess(locale, tenantSlug);

  if (!hasTenantPermission(access, "ticket:read")) {
    notFound();
  }

  const t = await getTranslations("AgentChat");
  const rawSessions = await listTenantChatSessionsAction({
    tenantSlug,
    locale,
  });

  const sessions: ChatSessionSummary[] = rawSessions.map((s) => ({
    id: s.id,
    status: s.status as ChatSessionSummary["status"],
    visitorName: s.visitorName,
    visitorEmail: s.visitorEmail,
    subject: s.subject,
    lastMessage: s.lastMessage,
    lastMessageAt: s.lastMessageAt,
    assigneeName: s.assigneeName,
    ticketId: s.ticketId,
  }));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <MessageSquare className="size-5" />
          </span>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {t("pageTitle")}
          </h1>
        </div>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {t("pageSubtitle")}
        </p>
      </div>

      {/* Main Chat Workspace */}
      <AgentChatWorkspace
        tenantSlug={tenantSlug}
        initialSessions={sessions}
        currentUserId={access.user.id}
      />
    </div>
  );
}
