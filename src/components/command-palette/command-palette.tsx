"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Command } from "cmdk";
import {
  Search,
  LifeBuoy,
  Users,
  BookOpen,
  BarChart3,
  Settings,
  CreditCard,
  Plus,
  Briefcase,
  X,
} from "lucide-react";
import { globalSearchAction, type SearchResultItem } from "@/lib/search/actions";

interface CommandPaletteProps {
  tenantSlug: string;
}

export function CommandPalette({ tenantSlug }: CommandPaletteProps) {
  const t = useTranslations("CommandPalette");
  const locale = useLocale();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [, startTransition] = useTransition();

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        const items = await globalSearchAction({
          tenantSlug,
          query,
          locale,
        });
        setResults(items);
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [query, tenantSlug, locale]);

  const runCommand = (action: () => void) => {
    setOpen(false);
    setQuery("");
    action();
  };

  const navActions = [
    {
      title: t("nav.dashboard"),
      icon: <BarChart3 className="size-4 text-primary" />,
      href: `/app/${tenantSlug}`,
    },
    {
      title: t("nav.tickets"),
      icon: <LifeBuoy className="size-4 text-primary" />,
      href: `/app/${tenantSlug}/tickets`,
    },
    {
      title: t("nav.crm"),
      icon: <Users className="size-4 text-primary" />,
      href: `/app/${tenantSlug}/crm`,
    },
    {
      title: t("nav.kb"),
      icon: <BookOpen className="size-4 text-primary" />,
      href: `/app/${tenantSlug}/kb`,
    },
    {
      title: t("nav.operations"),
      icon: <Briefcase className="size-4 text-primary" />,
      href: `/app/${tenantSlug}/operations`,
    },
    {
      title: t("nav.analytics"),
      icon: <BarChart3 className="size-4 text-primary" />,
      href: `/app/${tenantSlug}/analytics`,
    },
    {
      title: t("nav.settings"),
      icon: <Settings className="size-4 text-primary" />,
      href: `/app/${tenantSlug}/settings`,
    },
    {
      title: t("nav.billing"),
      icon: <CreditCard className="size-4 text-primary" />,
      href: `/app/${tenantSlug}/billing`,
    },
  ];

  return (
    <>
      {/* Trigger Button in Header */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-border bg-background/80 px-2.5 py-1.5 text-xs text-muted-foreground shadow-2xs transition-colors hover:border-primary/40 hover:bg-muted/50 hover:text-foreground"
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline-block font-medium">{t("triggerPlaceholder")}</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-semibold text-muted-foreground">
          <span className="text-[11px]">⌘</span>K
        </kbd>
      </button>

      {/* Command Dialog Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <Command className="w-full">
              {/* Search Bar Input */}
              <div className="flex items-center border-b border-border/80 px-4 py-3">
                <Search className="size-4 text-muted-foreground me-2 shrink-0" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder={t("inputPlaceholder")}
                  className="flex-1 bg-transparent text-sm text-foreground outline-hidden placeholder:text-muted-foreground"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Results List */}
              <Command.List className="max-h-96 overflow-y-auto p-2 space-y-2">
                <Command.Empty className="py-8 text-center text-xs text-muted-foreground">
                  {t("noResults")}
                </Command.Empty>

                {/* Dynamic DB Results */}
                {results.length > 0 && (
                  <Command.Group
                    heading={
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                        {t("groupResults")}
                      </span>
                    }
                  >
                    {results.map((item) => (
                      <Command.Item
                        key={item.id}
                        onSelect={() => runCommand(() => router.push(item.href))}
                        className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs cursor-pointer select-none transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {item.type === "ticket" && (
                            <LifeBuoy className="size-4 text-primary shrink-0" />
                          )}
                          {item.type === "customer" && (
                            <Users className="size-4 text-emerald-500 shrink-0" />
                          )}
                          {item.type === "kb" && (
                            <BookOpen className="size-4 text-amber-500 shrink-0" />
                          )}
                          <span className="font-semibold text-foreground truncate">
                            {item.title}
                          </span>
                        </div>
                        {item.subtitle && (
                          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                            {item.subtitle}
                          </span>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Quick Navigation Items */}
                <Command.Group
                  heading={
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                      {t("groupNavigation")}
                    </span>
                  }
                >
                  {navActions.map((item) => (
                    <Command.Item
                      key={item.href}
                      onSelect={() => runCommand(() => router.push(item.href))}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer select-none transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      {item.icon}
                      <span className="font-medium text-foreground">{item.title}</span>
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Quick Actions Group */}
                <Command.Group
                  heading={
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                      {t("groupActions")}
                    </span>
                  }
                >
                  <Command.Item
                    onSelect={() =>
                      runCommand(() => router.push(`/app/${tenantSlug}/tickets`))
                    }
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer select-none transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    <Plus className="size-4 text-primary" />
                    <span>{t("actions.newTicket")}</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() =>
                      runCommand(() => router.push(`/app/${tenantSlug}/crm`))
                    }
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer select-none transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    <Plus className="size-4 text-emerald-500" />
                    <span>{t("actions.newCustomer")}</span>
                  </Command.Item>
                </Command.Group>
              </Command.List>

              {/* Footer info */}
              <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-2 text-[10px] text-muted-foreground">
                <span>{t("hintNavigate")}</span>
                <span>{t("hintEsc")}</span>
              </div>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}
