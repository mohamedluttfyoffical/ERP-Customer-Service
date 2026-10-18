"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { type PlanStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { togglePlanStatusAction } from "@/lib/platform/actions";

interface PlanStatusToggleProps {
  planId: string;
  planName: string;
  currentStatus: PlanStatus;
}

export function PlanStatusToggle({
  planId,
  planName,
  currentStatus,
}: PlanStatusToggleProps) {
  const t = useTranslations("Platform.plans");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const nextStatus: PlanStatus = currentStatus === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
    startTransition(async () => {
      const res = await togglePlanStatusAction({
        planId,
        status: nextStatus,
        locale,
      });
      if (res.success) {
        toast.success(t("statusChanged", { name: planName, status: nextStatus }));
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
    >
      <Badge
        variant={currentStatus === "ACTIVE" ? "success" : "secondary"}
        className="cursor-pointer text-[10px]"
      >
        {isPending ? (
          <Loader2 className="size-2.5 animate-spin me-1" />
        ) : null}
        {currentStatus === "ACTIVE" ? t("statusActive") : t("statusArchived")}
      </Badge>
    </button>
  );
}
