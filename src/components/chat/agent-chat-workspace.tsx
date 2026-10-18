"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Loader2,
  CheckCircle,
  Ticket,
  Clock,
  Inbox,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  sendChatMessageAction,
  getChatSessionMessagesAction,
  assignChatSessionAction,
  closeChatSessionAction,
  convertChatToTicketAction,
  type ChatMessageItem,
} from "@/lib/chat/actions";
import { formatRelativeTime } from "@/lib/format";

export interface ChatSessionSummary {
  id: string;
  status: "WAITING" | "OPEN" | "ASSIGNED" | "CLOSED";
  visitorName: string;
  visitorEmail?: string | null;
  subject?: string | null;
  lastMessage: string;
  lastMessageAt: string;
  assigneeName?: string | null;
  ticketId?: string | null;
}

interface AgentChatWorkspaceProps {
  tenantSlug: string;
  initialSessions: ChatSessionSummary[];
  currentUserId: string;
}

export function AgentChatWorkspace({
  tenantSlug,
  initialSessions,
  currentUserId,
}: AgentChatWorkspaceProps) {
  const t = useTranslations("AgentChat");
  const locale = useLocale();

  const [sessions, setSessions] = useState<ChatSessionSummary[]>(initialSessions);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    initialSessions[0]?.id || null
  );
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputBody, setInputBody] = useState("");
  const [isPending, startTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages when selecting a session
  useEffect(() => {
    if (!selectedSessionId) {
      setMessages([]);
      return;
    }

    getChatSessionMessagesAction({ tenantSlug, sessionId: selectedSessionId }).then(
      (data) => setMessages(data)
    );

    const interval = setInterval(async () => {
      const updated = await getChatSessionMessagesAction({
        tenantSlug,
        sessionId: selectedSessionId,
      });
      setMessages(updated);
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedSessionId, tenantSlug]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !inputBody.trim()) return;

    const text = inputBody.trim();
    setInputBody("");

    // Optimistic
    const temp: ChatMessageItem = {
      id: `temp-${Date.now()}`,
      sessionId: selectedSessionId,
      senderType: "AGENT",
      senderName: "Agent",
      body: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, temp]);

    startTransition(async () => {
      await sendChatMessageAction({
        tenantSlug,
        sessionId: selectedSessionId,
        body: text,
        senderType: "AGENT",
        senderUserId: currentUserId,
        locale,
      });

      const updated = await getChatSessionMessagesAction({
        tenantSlug,
        sessionId: selectedSessionId,
      });
      setMessages(updated);
    });
  };

  const handleClaim = () => {
    if (!selectedSessionId) return;
    startTransition(async () => {
      const res = await assignChatSessionAction({
        tenantSlug,
        sessionId: selectedSessionId,
        locale,
      });
      if (res.success) {
        toast.success(t("claimedSuccess"));
        setSessions((prev) =>
          prev.map((s) =>
            s.id === selectedSessionId
              ? { ...s, status: "ASSIGNED", assigneeName: "You" }
              : s
          )
        );
      }
    });
  };

  const handleClose = () => {
    if (!selectedSessionId) return;
    startTransition(async () => {
      const res = await closeChatSessionAction({
        tenantSlug,
        sessionId: selectedSessionId,
        locale,
      });
      if (res.success) {
        toast.success(t("closedSuccess"));
        setSessions((prev) =>
          prev.map((s) => (s.id === selectedSessionId ? { ...s, status: "CLOSED" } : s))
        );
      }
    });
  };

  const handleConvertToTicket = () => {
    if (!selectedSessionId) return;
    startTransition(async () => {
      const res = await convertChatToTicketAction({
        tenantSlug,
        sessionId: selectedSessionId,
        locale,
      });
      if (res.success && res.ticketNumber) {
        toast.success(t("convertedSuccess", { number: res.ticketNumber }));
        setSessions((prev) =>
          prev.map((s) =>
            s.id === selectedSessionId
              ? { ...s, status: "CLOSED", ticketId: `T-${res.ticketNumber}` }
              : s
          )
        );
      }
    });
  };

  const getStatusBadge = (status: ChatSessionSummary["status"]) => {
    switch (status) {
      case "WAITING":
        return (
          <Badge variant="destructive" className="text-[10px] uppercase">
            {t("statusWaiting")}
          </Badge>
        );
      case "OPEN":
        return (
          <Badge variant="default" className="text-[10px] bg-emerald-600">
            {t("statusOpen")}
          </Badge>
        );
      case "ASSIGNED":
        return (
          <Badge variant="outline" className="text-[10px] border-primary text-primary">
            {t("statusAssigned")}
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge variant="secondary" className="text-[10px]">
            {t("statusClosed")}
          </Badge>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-border/80 bg-card shadow-xs overflow-hidden h-[750px]">
      {/* Sessions Sidebar */}
      <div className="lg:col-span-4 border-e border-border/70 flex flex-col h-full bg-muted/10">
        <div className="p-4 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              {t("inboxTitle")}
            </h3>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary font-mono">
            {sessions.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border/30">
          {sessions.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground">
              <Inbox className="mx-auto size-8 mb-2 opacity-30" />
              <p>{t("noActiveSessions")}</p>
            </div>
          ) : (
            sessions.map((s) => {
              const isSelected = s.id === selectedSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSessionId(s.id)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary/10 border-s-4 border-primary"
                      : "hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-foreground truncate">
                      {s.visitorName}
                    </span>
                    {getStatusBadge(s.status)}
                  </div>
                  {s.subject && (
                    <p className="text-[11px] font-medium text-foreground/80 truncate">
                      {s.subject}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground truncate line-clamp-1 mt-0.5">
                    {s.lastMessage}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      <span>{formatRelativeTime(new Date(s.lastMessageAt), locale)}</span>
                    </span>
                    {s.assigneeName && (
                      <span className="text-primary font-sans">
                        {s.assigneeName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Message & Action Workspace */}
      <div className="lg:col-span-8 flex flex-col h-full bg-background">
        {selectedSession ? (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/5">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-2xl bg-primary/10 text-primary font-bold">
                  {selectedSession.visitorName.charAt(0)}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    {selectedSession.visitorName}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {selectedSession.visitorEmail || t("anonymousVisitor")}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {selectedSession.status === "WAITING" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClaim}
                    disabled={isPending}
                    className="h-8 text-xs font-semibold"
                  >
                    <UserCheck className="size-3.5 me-1.5" />
                    <span>{t("claimChat")}</span>
                  </Button>
                )}

                {!selectedSession.ticketId && selectedSession.status !== "CLOSED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleConvertToTicket}
                    disabled={isPending}
                    className="h-8 text-xs font-semibold"
                  >
                    <Ticket className="size-3.5 me-1.5" />
                    <span>{t("convertToTicket")}</span>
                  </Button>
                )}

                {selectedSession.status !== "CLOSED" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleClose}
                    disabled={isPending}
                    className="h-8 text-xs font-semibold"
                  >
                    <CheckCircle className="size-3.5 me-1.5" />
                    <span>{t("endChat")}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-muted/5">
              {messages.map((m) => {
                const isAgent = m.senderType === "AGENT";
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      isAgent ? "items-end" : "items-start"
                    }`}
                  >
                    <span className="text-[10px] text-muted-foreground font-mono mb-1">
                      {isAgent ? t("you") : m.senderName || selectedSession.visitorName} ·{" "}
                      {formatRelativeTime(new Date(m.createdAt), locale)}
                    </span>
                    <div
                      className={`max-w-[75%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                        isAgent
                          ? "bg-primary text-primary-foreground rounded-br-xs"
                          : "bg-card border border-border text-foreground shadow-xs rounded-bl-xs"
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input composer */}
            {selectedSession.status !== "CLOSED" ? (
              <form
                onSubmit={handleSendMessage}
                className="border-t border-border/70 p-4 bg-card flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputBody}
                  onChange={(e) => setInputBody(e.target.value)}
                  placeholder={t("typeMessagePlaceholder")}
                  className="flex-1 rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || !inputBody.trim()}
                  className="rounded-xl px-4 h-10 font-bold"
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </form>
            ) : (
              <div className="border-t border-border/70 p-4 bg-muted/20 text-center text-xs text-muted-foreground font-medium">
                {t("sessionIsClosed")}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <MessageSquare className="size-12 mb-3 opacity-20" />
            <h4 className="text-sm font-bold text-foreground">{t("noSelectedSessionTitle")}</h4>
            <p className="text-xs mt-1">{t("noSelectedSessionDescription")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
