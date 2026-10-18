"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateKbArticleStatusAction } from "@/lib/kb/actions";
import { type KnowledgeStatus } from "@prisma/client";

interface ArticleStatusUpdaterProps {
  tenantSlug: string;
  articleId: string;
  currentStatus: KnowledgeStatus;
}

export function ArticleStatusUpdater({
  tenantSlug,
  articleId,
  currentStatus,
}: ArticleStatusUpdaterProps) {
  const t = useTranslations("KnowledgeBase");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (status: KnowledgeStatus) => {
    startTransition(async () => {
      const res = await updateKbArticleStatusAction({
        tenantSlug,
        articleId,
        status,
        locale,
      });

      if (res.success) {
        toast.success(t("statusUpdatedSuccess"));
      } else {
        toast.error(res.error || t("statusUpdateError"));
      }
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
      ) : (
        <select
          value={currentStatus}
          onChange={(e) => handleStatusChange(e.target.value as KnowledgeStatus)}
          aria-label={t("statusLabel")}
          className="rounded-lg border border-input bg-background px-2 py-1 text-[11px] font-semibold focus:border-primary focus:outline-hidden"
        >
          <option value="PUBLISHED">{t("statuses.PUBLISHED")}</option>
          <option value="DRAFT">{t("statuses.DRAFT")}</option>
          <option value="ARCHIVED">{t("statuses.ARCHIVED")}</option>
        </select>
      )}
    </div>
  );
}
