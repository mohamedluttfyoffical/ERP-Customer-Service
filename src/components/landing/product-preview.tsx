import { getTranslations } from "next-intl/server";
import {
  BarChart3,
  Bell,
  BookOpen,
  CircleDot,
  Clock3,
  Headset,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  TicketCheck,
  Users,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

const ticketRows = [
  { key: "ticketOne", priority: "urgent", status: "inProgress", tone: "text-destructive" },
  { key: "ticketTwo", priority: "high", status: "waiting", tone: "text-warning-foreground" },
  { key: "ticketThree", priority: "normal", status: "withinSla", tone: "text-muted-foreground" },
] as const;

export async function ProductPreview() {
  const t = await getTranslations("Landing.preview");
  const nav = await getTranslations("App.nav");

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[560px] select-none">
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl shadow-primary/10">
        <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-destructive/50" />
            <span className="size-2 rounded-full bg-warning/60" />
            <span className="size-2 rounded-full bg-success/60" />
          </div>
          <div
            dir="ltr"
            className="rounded-md border border-border/60 bg-background/70 px-3 py-1 font-mono text-[8px] text-muted-foreground"
          >
            app.sanad.app/demo
          </div>
          <Bell className="size-3 text-muted-foreground" />
        </div>

        <div className="grid grid-cols-[52px_1fr] sm:grid-cols-[136px_1fr]">
          <aside className="border-e border-border/70 bg-sidebar/70 p-2.5 sm:p-3">
            <div className="mb-5 flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Headset className="size-3.5" />
              </span>
              <span className="hidden text-xs font-semibold sm:block">سند</span>
            </div>
            <div className="space-y-1">
              {[
                { icon: LayoutDashboard, label: nav("dashboard"), active: true },
                { icon: TicketCheck, label: t("navTickets") },
                { icon: Users, label: nav("team") },
                { icon: Wrench, label: t("navOps") },
                { icon: BookOpen, label: t("navKb") },
                { icon: BarChart3, label: t("navReports") },
              ].map((item) => (
                <div
                  key={item.label}
                  className={
                    item.active
                      ? "flex items-center gap-2 rounded-md bg-sidebar-accent px-2 py-1.5 text-sidebar-accent-foreground"
                      : "flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground"
                  }
                >
                  <item.icon className="size-3" strokeWidth={1.9} />
                  <span className="hidden text-[8px] font-medium sm:block">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 hidden space-y-1 sm:block">
              <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground">
                <Settings2 className="size-3" strokeWidth={1.9} />
                <span className="text-[8px] font-medium">{nav("settings")}</span>
              </div>
            </div>
          </aside>

          <div className="min-w-0 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-medium text-muted-foreground">{t("queueSubtitle")}</p>
                <h3 className="mt-0.5 text-xs font-semibold sm:text-sm">{t("queue")}</h3>
              </div>
              <div className="flex -space-x-1.5 rtl:space-x-reverse">
                {["س", "م", "ع"].map((initial, index) => (
                  <span
                    key={initial}
                    className={`grid size-5 place-items-center rounded-full border-2 border-card text-[7px] font-semibold text-primary-foreground ${
                      index === 0 ? "bg-primary" : index === 1 ? "bg-chart-4" : "bg-chart-2"
                    }`}
                  >
                    {initial}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
              <div className="rounded-lg border border-border/70 bg-background p-2">
                <p className="text-[7px] text-muted-foreground">{t("tickets")}</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">24</p>
                <p className="text-[6px] font-medium text-success">+8%</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background p-2">
                <p className="text-[7px] text-muted-foreground">{t("response")}</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">18m</p>
                <p className="text-[6px] font-medium text-success">-12%</p>
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/[0.05] p-2">
                <p className="flex items-center gap-1 text-[7px] text-muted-foreground">
                  <ShieldCheck className="size-2 text-primary" />
                  {t("sla")}
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">96.4%</p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-primary/10">
                  <div className="h-full w-[96%] rounded-full bg-primary" />
                </div>
              </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-lg border border-border/70">
              {ticketRows.map((row, index) => (
                <div
                  key={row.key}
                  className={`flex items-center gap-2 px-2.5 py-2 ${
                    index === 0 ? "" : "border-t border-border/60"
                  }`}
                >
                  <span className={`size-1.5 shrink-0 rounded-full ${row.tone} bg-current`} />
                  <p className="min-w-0 flex-1 truncate text-[8px] font-medium">{t(row.key)}</p>
                  <span className="hidden shrink-0 rounded-full border border-border/60 px-1.5 py-0.5 text-[6px] text-muted-foreground sm:inline">
                    {t(row.priority)}
                  </span>
                  <Badge
                    variant={index === 0 ? "success" : index === 1 ? "warning" : "secondary"}
                    className="h-4 px-1.5 text-[6px]"
                  >
                    {t(row.status)}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="mt-2.5 flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5">
              <div className="flex items-center gap-1.5">
                <CircleDot className="size-2.5 text-success" />
                <span className="text-[7px] font-medium">{t("team")}</span>
              </div>
              <div className="flex items-center gap-1 text-[6px] text-muted-foreground">
                <Clock3 className="size-2.5" />
                <span>12m</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -start-4 -bottom-5 hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg sm:flex">
        <span className="grid size-7 place-items-center rounded-lg bg-success/10 text-success">
          <ShieldCheck className="size-3.5" />
        </span>
        <div>
          <p className="text-[8px] font-semibold">SLA · 96.4%</p>
          <p className="text-[7px] text-muted-foreground">tenant-isolated</p>
        </div>
      </div>
    </div>
  );
}
