"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitArticleFeedbackAction } from "@/lib/kb/actions";

interface ArticleFeedbackWidgetProps {
  tenantSlug: string;
  articleId: string;
}

export function ArticleFeedbackWidget({
  tenantSlug,
  articleId,
}: ArticleFeedbackWidgetProps) {
  const t = useTranslations("KnowledgeBase.feedback");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const [submitted, setSubmitted] = useState(false);
  const [isHelpful, setIsHelpful] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);

  const handleVote = (vote: boolean) => {
    setIsHelpful(vote);
    setShowCommentBox(true);
  };

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (isHelpful === null) return;

    startTransition(async () => {
      const res = await submitArticleFeedbackAction({
        tenantSlug,
        articleId,
        isHelpful,
        comment: comment.trim() || undefined,
        locale,
      });

      if (res.success) {
        setSubmitted(true);
        toast.success(t("thankYou"));
      } else {
        toast.error(res.error || t("submitError"));
      }
    });
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center text-xs">
        <CheckCircle2 className="mx-auto size-6 text-emerald-600 dark:text-emerald-400" />
        <h4 className="mt-2 font-bold text-foreground">{t("thankYouTitle")}</h4>
        <p className="mt-0.5 text-muted-foreground">{t("thankYouMessage")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs text-center space-y-3">
      <h4 className="text-xs font-bold text-foreground">{t("question")}</h4>

      {!showCommentBox ? (
        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleVote(true)}
            className="gap-1.5 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 dark:text-emerald-400"
          >
            <ThumbsUp className="size-3.5" />
            <span>{t("yes")}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleVote(false)}
            className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <ThumbsDown className="size-3.5" />
            <span>{t("no")}</span>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSendFeedback} className="space-y-3 max-w-md mx-auto">
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              isHelpful ? t("commentPlaceholderHelpful") : t("commentPlaceholderUnhelpful")
            }
            className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />

          <div className="flex items-center justify-center gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="gap-1.5 text-xs font-semibold"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              <span>{t("sendFeedback")}</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
