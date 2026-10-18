import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Home,
  Eye,
  Calendar,
  Plus,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { ArticleFeedbackWidget } from "@/components/kb/article-feedback-widget";
import { formatRelativeTime } from "@/lib/format";

interface PortalArticleDetailPageProps {
  params: Promise<{
    locale: string;
    tenantSlug: string;
    articleSlug: string;
  }>;
}

export default async function PortalArticleDetailPage(
  props: PortalArticleDetailPageProps
) {
  const { locale, tenantSlug, articleSlug } = await props.params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, name: true, slug: true },
  });

  if (!tenant) {
    notFound();
  }

  const article = await prisma.kbArticle.findFirst({
    where: {
      tenantId: tenant.id,
      slug: articleSlug,
      status: "PUBLISHED",
    },
    include: {
      category: {
        select: { nameAr: true, nameEn: true, slug: true },
      },
      author: {
        select: { name: true },
      },
    },
  });

  if (!article) {
    notFound();
  }

  // Atomically increment article view count in background
  await prisma.kbArticle.update({
    where: { id: article.id },
    data: { viewCount: { increment: 1 } },
  });

  const t = await getTranslations("Portal.articleDetail");

  const title = locale === "ar" ? article.titleAr : article.titleEn;
  const content = locale === "ar" ? article.contentAr : article.contentEn;
  const categoryName = article.category
    ? locale === "ar"
      ? article.category.nameAr
      : article.category.nameEn
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
        <Link
          href={`/portal/${tenantSlug}`}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Home className="size-3.5" />
          <span>{t("home")}</span>
        </Link>
        <span>/</span>
        <Link
          href={`/portal/${tenantSlug}/kb`}
          className="hover:text-foreground transition-colors"
        >
          {t("kbDirectory")}
        </Link>
        {categoryName && (
          <>
            <span>/</span>
            <Link
              href={`/portal/${tenantSlug}/kb?category=${article.category?.slug}`}
              className="hover:text-foreground transition-colors"
            >
              {categoryName}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="font-semibold text-foreground truncate max-w-[200px]">
          {title}
        </span>
      </nav>

      {/* Article Header Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {categoryName && (
            <Badge variant="outline" className="text-xs">
              {categoryName}
            </Badge>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <Eye className="size-3.5" />
              <span>{article.viewCount + 1} {t("views")}</span>
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              <span>{formatRelativeTime(article.publishedAt || article.createdAt, locale)}</span>
            </span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-snug">
          {title}
        </h1>

        {article.author?.name && (
          <p className="text-xs text-muted-foreground">
            {t("authorBy", { name: article.author.name })}
          </p>
        )}

        <hr className="border-border/60" />

        {/* Article Body */}
        <div className="prose dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-foreground/90 py-2">
          {content}
        </div>
      </div>

      {/* Helpful / Not Helpful Feedback Widget */}
      <ArticleFeedbackWidget
        tenantSlug={tenantSlug}
        articleId={article.id}
      />

      {/* Still need help CTA Banner */}
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-start">
          <h3 className="text-base font-bold text-foreground">
            {t("helpBannerTitle")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("helpBannerDescription")}
          </p>
        </div>
        <Link
          href={`/portal/${tenantSlug}/tickets/new`}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity"
        >
          <Plus className="size-4" />
          <span>{t("submitTicketCta")}</span>
        </Link>
      </div>
    </div>
  );
}
