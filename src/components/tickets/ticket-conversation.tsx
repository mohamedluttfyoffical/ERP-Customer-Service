"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Send,
  Lock,
  MessageSquare,
  ShieldAlert,
  UserCheck,
  Bot,
  User,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createTicketMessageAction } from "@/lib/tickets/actions";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CannedResponsePicker } from "@/components/tickets/canned-response-picker";
import {
  type MessageSenderType,
  type MessageVisibility,
} from "@prisma/client";

export interface ConversationMessage {
  id: string;
  senderType: MessageSenderType;
  visibility: MessageVisibility;
  body: string;
  createdAt: Date;
  senderUser?: {
    name: string | null;
    email: string;
  } | null;
  senderContact?: {
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
}

interface TicketConversationProps {
  tenantSlug: string;
  ticketId: string;
  messages: ConversationMessage[];
  canReply?: boolean;
}

export function TicketConversation({
  tenantSlug,
  ticketId,
  messages,
  canReply = true,
}: TicketConversationProps) {
  const t = useTranslations("Tickets.conversation");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!body.trim()) return;

    startTransition(async () => {
      const res = await createTicketMessageAction({
        tenantSlug,
        ticketId,
        body,
        isInternal,
        locale,
      });

      if (res.success) {
        toast.success(
          isInternal ? t("notePostedSuccess") : t("replyPostedSuccess")
        );
        setBody("");
      } else {
        toast.error(res.error || t("postFailed"));
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Messages Timeline */}
      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 p-8 text-center">
            <MessageSquare className="mx-auto size-8 text-muted-foreground/60" />
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              {t("noMessages")}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isNote = msg.visibility === "INTERNAL";
            const isAgent = msg.senderType === "AGENT";
            const isCustomer = msg.senderType === "CUSTOMER";

            const contactName = msg.senderContact
              ? `${msg.senderContact.firstName} ${msg.senderContact.lastName}`.trim()
              : null;
            const senderName =
              msg.senderUser?.name ||
              msg.senderUser?.email ||
              contactName ||
              (isAgent ? t("agent") : isCustomer ? t("customer") : t("system"));

            return (
              <div
                key={msg.id}
                className={cn(
                  "rounded-2xl border p-4.5 transition-all shadow-xs",
                  isNote
                    ? "border-amber-400/40 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-950/20"
                    : isAgent
                      ? "border-primary/20 bg-primary/[0.02]"
                      : "border-border/70 bg-card"
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-3 mb-3 border-border/40">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "grid size-8 place-items-center rounded-xl text-xs font-semibold",
                        isNote
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : isAgent
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isNote ? (
                        <Lock className="size-4" />
                      ) : isAgent ? (
                        <UserCheck className="size-4" />
                      ) : isCustomer ? (
                        <User className="size-4" />
                      ) : (
                        <Bot className="size-4" />
                      )}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {senderName}
                        </span>
                        {isNote ? (
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400 gap-1 font-semibold"
                          >
                            <Lock className="size-2.5" />
                            {t("internalNoteBadge")}
                          </Badge>
                        ) : isAgent ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-primary/10 text-primary font-medium"
                          >
                            {t("agentBadge")}
                          </Badge>
                        ) : isCustomer ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-muted-foreground/30 text-muted-foreground"
                          >
                            {t("customerBadge")}
                          </Badge>
                        ) : null}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {msg.senderUser?.email || msg.senderContact?.email || ""}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelativeTime(new Date(msg.createdAt), locale)}
                  </span>
                </div>

                {/* Body */}
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {msg.body}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      {canReply && (
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          {/* Tab buttons */}
          <div className="flex items-center gap-2 border-b border-border/50 pb-3 mb-3">
            <button
              type="button"
              onClick={() => setIsInternal(false)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                !isInternal
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Send className="size-3.5" />
              {t("replyToCustomer")}
            </button>
            <button
              type="button"
              onClick={() => setIsInternal(true)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                isInternal
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Lock className="size-3.5" />
              {t("internalNote")}
            </button>

            <div className="ms-auto">
              <CannedResponsePicker
                tenantSlug={tenantSlug}
                onSelectResponse={(text) =>
                  setBody((prev) => (prev ? `${prev}\n${text}` : text))
                }
              />
            </div>
          </div>

          {/* Alert if internal note */}
          {isInternal && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <ShieldAlert className="size-4 shrink-0" />
              <span>{t("internalNoteHint")}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              placeholder={
                isInternal
                  ? t("internalNotePlaceholder")
                  : t("replyPlaceholder")
              }
              className={cn(
                "w-full rounded-xl border p-3 text-sm focus:outline-hidden focus:ring-2 transition-all resize-y",
                isInternal
                  ? "border-amber-400/40 bg-amber-50/30 focus:border-amber-500 focus:ring-amber-500/20 dark:bg-amber-950/10"
                  : "border-input bg-background focus:border-primary focus:ring-primary/20"
              )}
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                {t("shortcutHint")}
              </span>
              <Button
                type="submit"
                disabled={isPending || !body.trim()}
                className={cn(
                  "gap-1.5 text-xs font-semibold",
                  isInternal &&
                    "bg-amber-600 hover:bg-amber-700 text-white border-transparent"
                )}
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : isInternal ? (
                  <Lock className="size-3.5" />
                ) : (
                  <Send className="size-3.5" />
                )}
                {isInternal ? t("submitNote") : t("submitReply")}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
