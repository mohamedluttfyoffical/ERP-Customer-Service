"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { FolderPlus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createKbCategoryAction } from "@/lib/kb/actions";

interface CreateCategoryDialogProps {
  tenantSlug: string;
}

export function CreateCategoryDialog({ tenantSlug }: CreateCategoryDialogProps) {
  const t = useTranslations("KnowledgeBase.createCategory");
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() || !nameEn.trim()) {
      toast.error(t("fillRequiredFields"));
      return;
    }

    startTransition(async () => {
      const res = await createKbCategoryAction({
        tenantSlug,
        nameAr,
        nameEn,
        descriptionAr: descriptionAr || undefined,
        descriptionEn: descriptionEn || undefined,
        locale,
      });

      if (res.success) {
        toast.success(t("createdSuccess"));
        setIsOpen(false);
        setNameAr("");
        setNameEn("");
        setDescriptionAr("");
        setDescriptionEn("");
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
        variant="outline"
        className="gap-1.5 text-xs font-semibold shadow-xs"
      >
        <FolderPlus className="size-3.5" />
        {t("button")}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FolderPlus className="size-5" />
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
              {/* Arabic & English Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t("nameArLabel")} *
                  </label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="مثال: الأسئلة الشائعة"
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t("nameEnLabel")} *
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="e.g. Frequently Asked Questions"
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t("descArLabel")}
                  </label>
                  <textarea
                    rows={2}
                    dir="rtl"
                    value={descriptionAr}
                    onChange={(e) => setDescriptionAr(e.target.value)}
                    placeholder="وصف مختصر للقسم بالعربية…"
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t("descEnLabel")}
                  </label>
                  <textarea
                    rows={2}
                    dir="ltr"
                    value={descriptionEn}
                    onChange={(e) => setDescriptionEn(e.target.value)}
                    placeholder="Brief description in English…"
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
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
                  disabled={isPending || !nameAr.trim() || !nameEn.trim()}
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
