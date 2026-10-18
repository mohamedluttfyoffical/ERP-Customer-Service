"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, BookOpen, X, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createKbArticleAction } from "@/lib/kb/actions";
import { type KnowledgeStatus } from "@prisma/client";

interface CategoryOption {
  id: string;
  name: string;
}

interface CreateArticleDialogProps {
  tenantSlug: string;
  categories: CategoryOption[];
}

export function CreateArticleDialog({
  tenantSlug,
  categories,
}: CreateArticleDialogProps) {
  const t = useTranslations("KnowledgeBase.createArticle");
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [contentAr, setContentAr] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [status, setStatus] = useState<KnowledgeStatus>("PUBLISHED");
  const [isFeatured, setIsFeatured] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleAr.trim() || !titleEn.trim() || !contentAr.trim() || !contentEn.trim()) {
      toast.error(t("fillRequiredFields"));
      return;
    }

    startTransition(async () => {
      const res = await createKbArticleAction({
        tenantSlug,
        categoryId: categoryId || undefined,
        titleAr,
        titleEn,
        contentAr,
        contentEn,
        status,
        isFeatured,
        locale,
      });

      if (res.success) {
        toast.success(t("createdSuccess"));
        setIsOpen(false);
        setTitleAr("");
        setTitleEn("");
        setContentAr("");
        setContentEn("");
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
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="size-5" />
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
              {/* Category & Status Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t("categoryLabel")}
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">{t("uncategorized")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t("statusLabel")}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as KnowledgeStatus)}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="PUBLISHED">{t("statuses.PUBLISHED")}</option>
                    <option value="DRAFT">{t("statuses.DRAFT")}</option>
                  </select>
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="flex items-center gap-2 rounded-xl border border-border/80 bg-muted/20 p-2.5 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="rounded text-primary focus:ring-primary size-4"
                    />
                    <Star className="size-3.5 text-amber-500 fill-amber-500/20" />
                    <span>{t("featuredLabel")}</span>
                  </label>
                </div>
              </div>

              {/* Bilingual Titles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t("titleArLabel")} *
                  </label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    placeholder="عنوان المقال بالعربية…"
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t("titleEnLabel")} *
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="Article title in English…"
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Bilingual Content */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t("contentArLabel")} *
                  </label>
                  <textarea
                    rows={4}
                    required
                    dir="rtl"
                    value={contentAr}
                    onChange={(e) => setContentAr(e.target.value)}
                    placeholder="محتوى المقال والشرح التفصيلي بالعربية…"
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 font-sans"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t("contentEnLabel")} *
                  </label>
                  <textarea
                    rows={4}
                    required
                    dir="ltr"
                    value={contentEn}
                    onChange={(e) => setContentEn(e.target.value)}
                    placeholder="Full article body content in English…"
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 font-sans"
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
                  disabled={
                    isPending ||
                    !titleAr.trim() ||
                    !titleEn.trim() ||
                    !contentAr.trim() ||
                    !contentEn.trim()
                  }
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
