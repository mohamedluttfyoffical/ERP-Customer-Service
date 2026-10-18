"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, ClipboardList, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createWorkOrderAction } from "@/lib/operations/actions";
import { type WorkOrderType, type TicketPriority } from "@prisma/client";

interface CustomerOption {
  id: string;
  name: string;
}

interface CreateWorkOrderDialogProps {
  tenantSlug: string;
  customers: CustomerOption[];
}

export function CreateWorkOrderDialog({
  tenantSlug,
  customers,
}: CreateWorkOrderDialogProps) {
  const t = useTranslations("Operations.createWorkOrder");
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<WorkOrderType>("CORRECTIVE_MAINTENANCE");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !customerId) {
      toast.error(t("fillRequiredFields"));
      return;
    }

    startTransition(async () => {
      const res = await createWorkOrderAction({
        tenantSlug,
        customerId,
        title,
        description: description || undefined,
        type,
        priority,
        locale,
      });

      if (res.success) {
        toast.success(t("createdSuccess"));
        setIsOpen(false);
        setTitle("");
        setDescription("");
      } else {
        toast.error(res.error || t("createdError"));
      }
    });
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="sm"
        className="gap-1.5 text-xs font-semibold shadow-xs"
      >
        <Plus className="size-3.5" />
        {t("button")}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <ClipboardList className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold">{t("title")}</h3>
                  <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Customer */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t("customerLabel")} *
                </label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t("titleLabel")} *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("titlePlaceholder")}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Type and Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t("typeLabel")}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as WorkOrderType)}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="CORRECTIVE_MAINTENANCE">{t("types.CORRECTIVE")}</option>
                    <option value="PREVENTIVE_MAINTENANCE">{t("types.PREVENTIVE")}</option>
                    <option value="INSPECTION">{t("types.INSPECTION")}</option>
                    <option value="INSTALLATION">{t("types.INSTALLATION")}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t("priorityLabel")}
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="LOW">{t("priorities.LOW")}</option>
                    <option value="MEDIUM">{t("priorities.MEDIUM")}</option>
                    <option value="HIGH">{t("priorities.HIGH")}</option>
                    <option value="URGENT">{t("priorities.URGENT")}</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t("descriptionLabel")}
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || !title.trim() || !customerId}
                  className="gap-1.5 font-semibold"
                >
                  {isPending && <Loader2 className="size-3.5 animate-spin" />}
                  {t("submit")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
