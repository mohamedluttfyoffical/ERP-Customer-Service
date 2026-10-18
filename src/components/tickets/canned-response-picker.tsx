"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Zap, Plus, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listCannedResponsesAction,
  createCannedResponseAction,
  type CannedResponseItem,
} from "@/lib/tickets/canned-actions";
import { toast } from "sonner";

interface CannedResponsePickerProps {
  tenantSlug: string;
  onSelectResponse: (text: string) => void;
}

export function CannedResponsePicker({
  tenantSlug,
  onSelectResponse,
}: CannedResponsePickerProps) {
  const t = useTranslations("CannedResponses");
  const locale = useLocale();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [items, setItems] = useState<CannedResponseItem[]>([]);
  const [shortcut, setShortcut] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      listCannedResponsesAction({ tenantSlug, locale }).then((data) => setItems(data));
    }
  }, [isOpen, tenantSlug, locale]);

  const handleSelect = (item: CannedResponseItem) => {
    onSelectResponse(item.body);
    setIsOpen(false);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createCannedResponseAction({
        tenantSlug,
        shortcut,
        title,
        body,
        locale,
      });

      if (res.success) {
        toast.success(t("createdSuccess"));
        setIsCreateOpen(false);
        setShortcut("");
        setTitle("");
        setBody("");
        const refreshed = await listCannedResponsesAction({ tenantSlug, locale });
        setItems(refreshed);
      } else {
        toast.error(res.error || t("createdError"));
      }
    });
  };

  return (
    <div className="relative inline-block">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-7 text-xs font-medium gap-1.5"
      >
        <Zap className="size-3 text-amber-500" />
        <span>{t("triggerButton")}</span>
      </Button>

      {isOpen && (
        <div className="absolute start-0 bottom-full mb-2 w-72 sm:w-80 rounded-2xl border border-border bg-card p-3 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>{t("title")}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="size-3" />
              <span>{t("newShortcut")}</span>
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1">
            {items.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <p>{t("empty")}</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="p-2 rounded-xl text-xs hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between gap-1 font-semibold text-foreground">
                    <span>{item.title}</span>
                    <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      /{item.shortcut}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                    {item.body}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal for creating a new canned response */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-foreground">{t("createTitle")}</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">{t("shortcutLabel")} *</label>
                <div className="relative">
                  <span className="absolute start-3 top-2.5 text-muted-foreground font-mono text-xs">/</span>
                  <input
                    type="text"
                    required
                    value={shortcut}
                    onChange={(e) => setShortcut(e.target.value)}
                    placeholder="welcome"
                    className="w-full rounded-xl border border-input bg-background ps-6 pe-3 py-2 text-xs focus:border-primary focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">{t("nameLabel")} *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Greeting & Acknowledgement"
                  className="w-full rounded-xl border border-input bg-background p-2 text-xs focus:border-primary focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">{t("bodyLabel")} *</label>
                <textarea
                  required
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={t("bodyPlaceholder")}
                  className="w-full rounded-xl border border-input bg-background p-2 text-xs focus:border-primary focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? <Loader2 className="size-3.5 animate-spin" /> : t("save")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
