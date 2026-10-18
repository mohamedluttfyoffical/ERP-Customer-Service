import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  BookOpen,
  FolderTree,
  Eye,
  ThumbsUp,
  Search,
  Star,
  ExternalLink,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getTenantAccess, hasTenantPermission } from "@/lib/tenants/context";
import { CreateCategoryDialog } from "@/components/kb/create-category-dialog";
import { CreateArticleDialog } from "@/components/kb/create-article-dialog";
import { ArticleStatusUpdater } from "@/components/kb/article-status-updater";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { formatRelativeTime } from "@/lib/format";
import { type KnowledgeStatus, type Prisma } from "@prisma/client";

interface KbPageProps {
  params: Promise<{
    locale: string;
    tenantSlug: string;
  }>;
  searchParams: Promise<{
    category?: string;
    status?: string;
    q?: string;
  }>;
}

export default async function KnowledgeBasePage(props: KbPageProps) {
  const { locale, tenantSlug } = await props.params;
  const search = await props.searchParams;

  const access = await getTenantAccess(locale, tenantSlug);

  if (!hasTenantPermission(access, "kb:read")) {
    notFound();
  }

  const t = await getTranslations("KnowledgeBase");
  const tenantId = access.tenant.id;

  const selectedCategory = search.category || "ALL";
  const selectedStatus = search.status || "ALL";
  const searchQuery = search.q?.trim() || "";

  const where: Prisma.KbArticleWhereInput = {
    tenantId,
  };

  if (selectedCategory !== "ALL") {
    where.categoryId = selectedCategory;
  }

  if (
    selectedStatus !== "ALL" &&
    (selectedStatus === "PUBLISHED" ||
      selectedStatus === "DRAFT" ||
      selectedStatus === "ARCHIVED")
  ) {
    where.status = selectedStatus as KnowledgeStatus;
  }

  if (searchQuery) {
    where.OR = [
      { titleAr: { contains: searchQuery, mode: "insensitive" } },
      { titleEn: { contains: searchQuery, mode: "insensitive" } },
      { contentAr: { contains: searchQuery, mode: "insensitive" } },
      { contentEn: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  const [articles, categories, totalPublished, totalHelpful] =
    await Promise.all([
      prisma.kbArticle.findMany({
        where,
        include: {
          category: {
            select: { id: true, nameAr: true, nameEn: true, slug: true },
          },
          author: { select: { name: true, email: true } },
        },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      }),
      prisma.kbCategory.findMany({
        where: { tenantId },
        include: { _count: { select: { articles: true } } },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.kbArticle.count({
        where: { tenantId, status: "PUBLISHED" },
      }),
      prisma.kbArticleFeedback.count({
        where: { tenantId, isHelpful: true },
      }),
    ]);

  const categoryOptions = categories.map((c) => ({
    id: c.id,
    name: locale === "ar" ? c.nameAr : c.nameEn,
  }));

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="size-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {t("title")}
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/portal/${tenantSlug}/kb`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <ExternalLink className="size-3.5" />
            <span>{t("viewPublicKb")}</span>
          </Link>
          <CreateCategoryDialog tenantSlug={tenantSlug} />
          <CreateArticleDialog
            tenantSlug={tenantSlug}
            categories={categoryOptions}
          />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("metrics.totalArticles")}
            </span>
            <BookOpen className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold">{articles.length}</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("metrics.published")}
            </span>
            <BookOpen className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {totalPublished}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("metrics.categories")}
            </span>
            <FolderTree className="size-4 text-muted-foreground/70" />
          </div>
          <div className="mt-2 text-2xl font-bold">{categories.length}</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("metrics.helpfulVotes")}
            </span>
            <ThumbsUp className="size-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-500">
            {totalHelpful}
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <Link
            href={`/app/${tenantSlug}/kb`}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              selectedCategory === "ALL" && selectedStatus === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border/80 bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {t("filterAll")}
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/app/${tenantSlug}/kb?category=${c.id}`}
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                selectedCategory === c.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border border-border/80 bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <span>{locale === "ar" ? c.nameAr : c.nameEn}</span>
              <span className="ms-1 text-[10px] opacity-75">
                ({c._count.articles})
              </span>
            </Link>
          ))}
        </div>

        <form method="GET" className="relative w-full sm:w-72">
          <Search className="absolute start-3 top-2.5 size-3.5 text-muted-foreground" />
          <input
            type="text"
            name="q"
            defaultValue={searchQuery}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-input bg-card ps-9 pe-3 py-1.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
        </form>
      </div>

      {/* Articles Table */}
      {articles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 p-12 text-center">
          <BookOpen className="mx-auto size-10 text-muted-foreground/60" />
          <h3 className="mt-3 text-sm font-semibold">{t("emptyTitle")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="border-b border-border/70 bg-muted/40 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4 text-start">{t("table.article")}</th>
                  <th className="py-3 px-4 text-start">{t("table.category")}</th>
                  <th className="py-3 px-4 text-start">{t("table.status")}</th>
                  <th className="py-3 px-4 text-start">{t("table.views")}</th>
                  <th className="py-3 px-4 text-start">{t("table.feedback")}</th>
                  <th className="py-3 px-4 text-start">{t("table.author")}</th>
                  <th className="py-3 px-4 text-start">{t("table.date")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {articles.map((art) => (
                  <tr
                    key={art.id}
                    className="group transition-colors hover:bg-muted/30"
                  >
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        {art.isFeatured && (
                          <Star className="size-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                        <div>
                          <div className="line-clamp-1">
                            {locale === "ar" ? art.titleAr : art.titleEn}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {locale === "ar" ? art.titleEn : art.titleAr}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {art.category ? (
                        <Badge variant="outline" className="text-[10px]">
                          {locale === "ar"
                            ? art.category.nameAr
                            : art.category.nameEn}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">
                          —
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <ArticleStatusUpdater
                        tenantSlug={tenantSlug}
                        articleId={art.id}
                        currentStatus={art.status}
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 font-mono text-muted-foreground">
                        <Eye className="size-3" />
                        <span>{art.viewCount}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          +{art.helpfulCount}
                        </span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-destructive">
                          -{art.notHelpfulCount}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                      {art.author?.name || art.author?.email || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                      {formatRelativeTime(new Date(art.createdAt), locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
