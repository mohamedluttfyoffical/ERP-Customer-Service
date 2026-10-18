"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  LifeBuoy,
  Send,
  Loader2,
  Home,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { submitPortalTicketAction } from "@/lib/portal/actions";
import { type TicketPriority } from "@prisma/client";

interface PortalNewTicketPageProps {
  params: Promise<{
    locale: string;
    tenantSlug: string;
  }>;
}

export default function PortalNewTicketPage({
  params,
}: PortalNewTicketPageProps) {
  const t = useTranslations("Portal.newTicket");
  const locale = useLocale();
  const router = useRouter();

  const [tenantSlug, setTenantSlug] = useState("");
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");

  // Resolve params asynchronously on mount
  useState(() => {
    params.then((p) => setTenantSlug(p.tenantSlug));
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !description.trim()) {
      toast.error(t("fillRequiredFields"));
      return;
    }

    startTransition(async () => {
      const res = await submitPortalTicketAction({
        tenantSlug,
        name,
        email,
        phone: phone || undefined,
        subject,
        description,
        priority,
        locale,
      });

      if (!res.success) {
        toast.error(res.error || t("submitError"));
        return;
      }

      if (res.ticketNumber) {
        toast.success(t("submittedSuccess", { number: res.ticketNumber }));
        router.push(
          `/portal/${tenantSlug}/tickets/${res.ticketNumber}?email=${encodeURIComponent(
            email
          )}`
        );
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href={`/portal/${tenantSlug}`}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Home className="size-3.5" />
          <span>{t("home")}</span>
        </Link>
        <span>/</span>
        <span className="font-semibold text-foreground">{t("title")}</span>
      </nav>

      {/* Main Form Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <LifeBuoy className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {t("emailLabel")} *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* Ticket Subject */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {t("subjectLabel")} *
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("subjectPlaceholder")}
              className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Detailed Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {t("descriptionLabel")} *
            </label>
            <textarea
              rows={5}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
              <ShieldCheck className="size-4 text-primary" />
              <span>{t("slaGuaranteedNotice")}</span>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="gap-2 font-semibold text-xs px-5"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              <span>{t("submitButton")}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
