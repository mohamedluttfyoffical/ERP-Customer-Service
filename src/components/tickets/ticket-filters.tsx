"use client";

import { useTranslations } from "next-intl";
import { LayoutGrid, List, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface TicketFiltersProps {
  tenantSlug: string;
  currentView: "list" | "kanban";
  currentStatus?: string;
  currentPriority?: string;
  searchQuery?: string;
}

export function TicketFilters({
  tenantSlug,
  currentView,
  currentStatus,
  currentPriority,
  searchQuery,
}: TicketFiltersProps) {
  const t = useTranslations("Tickets");

  const statuses = [
    { key: "ALL", label: t("filterAll") },
    { key: "OPEN", label: t("statuses.OPEN") },
    { key: "IN_PROGRESS", label: t("statuses.IN_PROGRESS") },
    { key: "PENDING_CUSTOMER", label: t("statuses.PENDING_CUSTOMER") },
    { key: "ESCALATED", label: t("statuses.ESCALATED") },
    { key: "RESOLVED", label: t("statuses.RESOLVED") },
    { key: "CLOSED", label: t("statuses.CLOSED") },
  ];

  const buildUrl = (newParams: { view?: string; status?: string; priority?: string; q?: string }) => {
    const params = new URLSearchParams();
    const view = newParams.view ?? currentView;
    const status = newParams.status !== undefined ? newParams.status : currentStatus;
    const priority = newParams.priority !== undefined ? newParams.priority : currentPriority;
    const q = newParams.q !== undefined ? newParams.q : searchQuery;

    if (view && view !== "list") params.set("view", view);
    if (status && status !== "ALL") params.set("status", status);
    if (priority && priority !== "ALL") params.set("priority", priority);
    if (q) params.set("q", q);

    const str = params.toString();
    return `/app/${tenantSlug}/tickets${str ? `?${str}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          {statuses.map((st) => {
            const isSelected = (!currentStatus && st.key === "ALL") || currentStatus === st.key;
            return (
              <Link
                key={st.key}
                href={buildUrl({ status: st.key })}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition-colors whitespace-nowrap ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-card border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {st.label}
              </Link>
            );
          })}
        </div>

        {/* View Switcher and Search */}
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center rounded-xl border border-border bg-card p-0.5">
            <Link
              href={buildUrl({ view: "list" })}
              className={`rounded-lg p-1.5 transition-colors ${
                currentView === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={t("viewList")}
            >
              <List className="size-4" />
            </Link>
            <Link
              href={buildUrl({ view: "kanban" })}
              className={`rounded-lg p-1.5 transition-colors ${
                currentView === "kanban"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={t("viewKanban")}
            >
              <LayoutGrid className="size-4" />
            </Link>
          </div>

          {/* Search */}
          <form className="relative min-w-56" method="GET">
            <input type="hidden" name="view" value={currentView} />
            {currentStatus && currentStatus !== "ALL" ? (
              <input type="hidden" name="status" value={currentStatus} />
            ) : null}
            <Search className="absolute start-3 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery ?? ""}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-xl border border-border bg-card ps-9 pe-3 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </form>
        </div>
      </div>
    </div>
  );
}
