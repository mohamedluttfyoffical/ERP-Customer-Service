"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  Bot,
  User,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  startCustomerChatSessionAction,
  sendChatMessageAction,
  getChatSessionMessagesAction,
  type ChatMessageItem,
} from "@/lib/chat/actions";
import { getPusherClient } from "@/lib/realtime/client";

interface CustomerChatWidgetProps {
  tenantSlug: string;
  tenantName: string;
}

export function CustomerChatWidget({
  tenantSlug,
  tenantName,
}: CustomerChatWidgetProps) {
  const t = useTranslations("ChatWidget");
  const locale = useLocale();

  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputBody, setInputBody] = useState("");
  const [isPending, startTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Load active session from sessionStorage if any
  useEffect(() => {
    const savedSessionId = sessionStorage.getItem(`sanad_chat_${tenantSlug}`);
    if (savedSessionId) {
      setSessionId(savedSessionId);
      getChatSessionMessagesAction({ tenantSlug, sessionId: savedSessionId }).then(
        (data) => setMessages(data)
      );
    }
  }, [tenantSlug]);

  // Real-time listener for incoming messages on this chat session
  useEffect(() => {
    if (!sessionId) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    // We need tenantId or we query messages on polling
    const interval = setInterval(async () => {
      const latest = await getChatSessionMessagesAction({ tenantSlug, sessionId });
      setMessages(latest);
    }, 4000);

    return () => clearInterval(interval);
  }, [sessionId, tenantSlug]);

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !initialMessage.trim()) return;

    startTransition(async () => {
      const res = await startCustomerChatSessionAction({
        tenantSlug,
        visitorName: name,
        visitorEmail: email,
        subject,
        initialMessage,
        locale,
      });

      if (res.success && res.sessionId) {
        setSessionId(res.sessionId);
        sessionStorage.setItem(`sanad_chat_${tenantSlug}`, res.sessionId);
        setMessages([
          {
            id: `msg-${Date.now()}`,
            sessionId: res.sessionId,
            senderType: "CUSTOMER",
            senderName: name,
            body: initialMessage,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !inputBody.trim()) return;

    const text = inputBody.trim();
    setInputBody("");

    // Optimistic message update
    const tempMessage: ChatMessageItem = {
      id: `temp-${Date.now()}`,
      sessionId,
      senderType: "CUSTOMER",
      senderName: name || "You",
      body: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    startTransition(async () => {
      await sendChatMessageAction({
        tenantSlug,
        sessionId,
        body: text,
        senderType: "CUSTOMER",
        locale,
      });

      const updated = await getChatSessionMessagesAction({ tenantSlug, sessionId });
      setMessages(updated);
    });
  };

  return (
    <div className="fixed bottom-6 end-6 z-50">
      {/* Floating Trigger Bubble */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl focus:outline-hidden"
          aria-label={t("openChat")}
        >
          <span className="relative">
            <MessageSquare className="size-5" />
            <span className="absolute -top-1 -end-1 size-2.5 rounded-full bg-emerald-400 border-2 border-primary" />
          </span>
          <span className="text-xs font-bold hidden sm:inline-block">
            {t("chatWithUs")}
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[350px] sm:w-[380px] h-[520px] rounded-3xl border border-border/80 bg-card shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/70 bg-primary/10 p-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-xs">
                <Bot className="size-5" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-foreground leading-tight">
                  {tenantName}
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{t("onlineSupport")}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
            {!sessionId ? (
              /* Pre-chat Form */
              <form onSubmit={handleStartSession} className="space-y-3 py-2">
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                  <ShieldCheck className="size-4 text-primary inline-block me-1.5" />
                  <span>{t("introNotice")}</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {t("nameLabel")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("namePlaceholder")}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {t("emailLabel")} *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {t("subjectLabel")}
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t("subjectPlaceholder")}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {t("initialMessageLabel")} *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={initialMessage}
                    onChange={(e) => setInitialMessage(e.target.value)}
                    placeholder={t("initialMessagePlaceholder")}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-xl text-xs font-bold"
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <span>{t("startChatButton")}</span>
                  )}
                </Button>
              </form>
            ) : (
              /* Active Chat Message Thread */
              <div className="space-y-3">
                {messages.map((m) => {
                  const isCustomer = m.senderType === "CUSTOMER";
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        isCustomer ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1 font-medium">
                        {isCustomer ? (
                          <span>{t("you")}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-primary font-bold">
                            <User className="size-3" />
                            <span>{m.senderName || t("agent")}</span>
                          </span>
                        )}
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                          isCustomer
                            ? "bg-primary text-primary-foreground rounded-br-xs"
                            : "bg-card border border-border text-foreground shadow-2xs rounded-bl-xs"
                        }`}
                      >
                        {m.body}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Footer Input for Active Session */}
          {sessionId && (
            <form
              onSubmit={handleSendMessage}
              className="border-t border-border/80 bg-background p-3 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputBody}
                onChange={(e) => setInputBody(e.target.value)}
                placeholder={t("replyPlaceholder")}
                className="flex-1 rounded-xl border border-input bg-muted/30 px-3 py-2 text-xs focus:border-primary focus:outline-hidden"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isPending || !inputBody.trim()}
                className="rounded-xl px-3"
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
