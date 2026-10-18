"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, Loader2, PauseCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { suspendTenantAction, activateTenantAction } from "@/lib/platform/actions";

interface TenantRowActionsProps {
  tenantId: string;
  tenantName: string;
  currentStatus: string;
}

export function TenantRowActions({
  tenantId,
  tenantName,
  currentStatus,
}: TenantRowActionsProps) {
  const t = useTranslations("Platform.tenants");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [reason, setReason] = useState("");

  const isSuspended = currentStatus === "SUSPENDED";

  const handleActivate = () => {
    startTransition(async () => {
      const res = await activateTenantAction({ tenantId, locale });
      if (res.success) {
        toast.success(t("activatedSuccess", { name: tenantName }));
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleSuspend = () => {
    startTransition(async () => {
      const res = await suspendTenantAction({
        tenantId,
        reason: reason.trim() || undefined,
        locale,
      });
      if (res.success) {
        toast.success(t("suspendedSuccess", { name: tenantName }));
        setShowSuspendModal(false);
        setReason("");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-1.5 justify-end">
        {isSuspended ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1 text-success border-success/30 hover:bg-success/10"
            disabled={isPending}
            onClick={handleActivate}
          >
            {isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3" />
            )}
            {t("activate")}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
            disabled={isPending}
            onClick={() => setShowSuspendModal(true)}
          >
            {isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <PauseCircle className="size-3" />
            )}
            {t("suspend")}
          </Button>
        )}
      </div>

      {showSuspendModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive">
                <ShieldAlert className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold">{t("suspendModalTitle")}</h3>
                <p className="text-xs text-muted-foreground">{tenantName}</p>
              </div>
            </div>

            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {t("suspendWarning")}
            </p>

            <div className="mt-4">
              <label className="text-[11px] font-medium text-foreground block mb-1.5">
                {t("suspendReasonLabel")}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("suspendReasonPlaceholder")}
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSuspendModal(false)}
                disabled={isPending}
              >
                {t("cancel")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSuspend}
                disabled={isPending}
                className="gap-1.5"
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {t("confirmSuspend")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
