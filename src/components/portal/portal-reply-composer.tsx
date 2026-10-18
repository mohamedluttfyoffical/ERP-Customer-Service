"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitPortalMessageAction } from "@/lib/portal/actions";

interface PortalReplyComposerProps {
  tenantSlug: string;
  ticketNumber: number;
  email: string;
}

export function PortalReplyComposer({
  tenantSlug,
  ticketNumber,
  email,
}: PortalReplyComposerProps) {
  const t = useTranslations("Portal.ticketDetail");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    startTransition(async () => {
      const res = await submitPortalMessageAction({
        tenantSlug,
        ticketNumber,
        email,
        body,
        locale,
      });

      if (res.success) {
        toast.success(t("replySuccess"));
        setBody("");
      } else {
        toast.error(res.error || t("replyError"));
      }
    });
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("replyPlaceholder")}
          className="w-full rounded-xl border border-input bg-background p-3 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all resize-y"
        />

        <div className="flex items-center justify-end">
          <Button
            type="submit"
            disabled={isPending || !body.trim()}
            className="gap-1.5 text-xs font-semibold px-4"
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            <span>{t("sendReply")}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
