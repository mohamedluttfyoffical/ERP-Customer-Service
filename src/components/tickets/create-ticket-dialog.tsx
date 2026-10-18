"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Plus, TicketPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createTicketAction } from "@/lib/tickets/actions";
import { type TicketPriority, type TicketType } from "@prisma/client";

interface CustomerOption {
  id: string;
  name: string;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface CreateTicketDialogProps {
  tenantSlug: string;
  customers: CustomerOption[];
  departments: DepartmentOption[];
}

export function CreateTicketDialog({
  tenantSlug,
  customers,
  departments,
}: CreateTicketDialogProps) {
  const t = useTranslations("Tickets.create");
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || "");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [type, setType] = useState<TicketType>("QUESTION");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || !customerId) {
      toast.error(t("fillRequiredFields"));
      return;
    }

    startTransition(async () => {
      const res = await createTicketAction({
        tenantSlug,
        subject,
        description,
        customerId,
        departmentId: departmentId || null,
        priority,
        type,
        locale,
      });

      if (res.success) {
        toast.success(t("createdSuccess"));
        setIsOpen(false);
        setSubject("");
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

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <TicketPlus className="size-5" />
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
              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  {t("subjectLabel")} *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t("subjectPlaceholder")}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    {t("customerLabel")} *
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    {t("departmentLabel")}
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">{t("noDepartment")}</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    {t("priorityLabel")}
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="LOW">{t("priorityLow")}</option>
                    <option value="MEDIUM">{t("priorityMedium")}</option>
                    <option value="HIGH">{t("priorityHigh")}</option>
                    <option value="URGENT">{t("priorityUrgent")}</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    {t("typeLabel")}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as TicketType)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="QUESTION">{t("typeQuestion")}</option>
                    <option value="INCIDENT">{t("typeIncident")}</option>
                    <option value="PROBLEM">{t("typeProblem")}</option>
                    <option value="FEATURE_REQUEST">{t("typeFeature")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  {t("descriptionLabel")} *
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
                  {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  {t("submit")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
