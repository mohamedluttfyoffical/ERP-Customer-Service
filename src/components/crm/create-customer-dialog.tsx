"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, UserPlus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCustomerAction } from "@/lib/crm/actions";
import { type CustomerType } from "@prisma/client";

interface CreateCustomerDialogProps {
  tenantSlug: string;
}

export function CreateCustomerDialog({ tenantSlug }: CreateCustomerDialogProps) {
  const t = useTranslations("Crm.create");
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [type, setType] = useState<CustomerType>("COMPANY");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("fillRequiredFields"));
      return;
    }

    startTransition(async () => {
      const res = await createCustomerAction({
        tenantSlug,
        name,
        type,
        email: email || undefined,
        phone: phone || undefined,
        industry: industry || undefined,
        city: city || undefined,
        locale,
      });

      if (res.success) {
        toast.success(t("createdSuccess"));
        setIsOpen(false);
        setName("");
        setEmail("");
        setPhone("");
        setIndustry("");
        setCity("");
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
                  <UserPlus className="size-5" />
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
              {/* Customer Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t("nameLabel")} *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Customer Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t("typeLabel")}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as CustomerType)}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="COMPANY">{t("types.COMPANY")}</option>
                    <option value="INDIVIDUAL">{t("types.INDIVIDUAL")}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t("industryLabel")}
                  </label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder={t("industryPlaceholder")}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t("emailLabel")}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@customer.com"
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t("phoneLabel")}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+966 50 123 4567"
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t("cityLabel")}
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t("cityPlaceholder")}
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
                  disabled={isPending || !name.trim()}
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
