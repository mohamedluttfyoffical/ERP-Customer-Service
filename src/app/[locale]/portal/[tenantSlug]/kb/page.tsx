import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  BookOpen,
  Search,
  Eye,
  Star,
  Home,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/format";
import { type Prisma } from "@prisma/client";

interface PortalKbPageProps {
  params: Promise<{
    locale: string;
    tenantSlug: string;
  }>;
  searchParams: Promise<{
    category?: string;
    q?: string;
  }>;
}

export default async function PortalKbPage(props: PortalKbPageProps) {
  const { locale, tenantSlug } = await props.params;
  const search = await props.searchParams;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, name: true, slug: true },
  });

  if (!tenant) {
    notFound();
  }

  const t = await getTranslations("Portal.kbDirectory");
  const selectedCatSlug = search.category;
  const searchQuery = search.q?.trim() || "";

  const where: Prisma.KbArticleWhereInput = {
    tenantId: tenant.id,
    status: "PUBLISHED",
  };

  if (selectedCatSlug) {
    where.category = { slug: selectedCatSlug };
  }

  if (searchQuery) {
    where.OR = [
      { titleAr: { contains: searchQuery, mode: "insensitive" } },
      { titleEn: { contains: searchQuery, mode: "insensitive" } },
      { contentAr: { contains: searchQuery, mode: "insensitive" } },
      { contentEn: { contains: searchQuery, mode: "insensitive" } },
      { keywords: { has: searchQuery } },
    ];
  }

  const [articles, categories] = await Promise.all([
    prisma.kbArticle.findMany({
      where,
      include: {
        category: {
          select: { nameAr: true, nameEn: true, slug: true },
        },
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    }),
    prisma.kbCategory.findMany({
      where: {
        tenantId: tenant.id,
        isPublished: true,
      },
      include: {
        _count: {
          select: {
            articles: { where: { status: "PUBLISHED" } },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
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

      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <form method="GET" className="relative w-full md:w-80">
          <Search className="absolute start-3 top-2.5 size-3.5 text-muted-foreground" />
          <input
            type="text"
            name="q"
            defaultValue={searchQuery}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-input bg-card ps-9 pe-3 py-2 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 shadow-xs"
          />
        </form>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <Link
          href={`/portal/${tenantSlug}/kb`}
          className={`rounded-xl px-3.5 py-1.5 font-medium transition-colors ${
            !selectedCatSlug
              ? "bg-primary text-primary-foreground shadow-xs"
              : "border border-border/80 bg-background text-muted-foreground hover:bg-muted"
          }`}
        >
          {t("allCategories")}
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/portal/${tenantSlug}/kb?category=${cat.slug}`}
            className={`rounded-xl px-3.5 py-1.5 font-medium transition-colors ${
              selectedCatSlug === cat.slug
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border/80 bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            <span>{locale === "ar" ? cat.nameAr : cat.nameEn}</span>
            <span className="ms-1.5 text-[10px] opacity-75">
              ({cat._count.articles})
            </span>
          </Link>
        ))}
      </div>

      {/* Articles Grid */}
      {articles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 p-12 text-center">
          <BookOpen className="mx-auto size-10 text-muted-foreground/60" />
          <h3 className="mt-3 text-sm font-semibold">{t("emptyTitle")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((art) => (
            <Link
              key={art.id}
              href={`/portal/${tenantSlug}/kb/${art.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  {art.category && (
                    <Badge variant="outline" className="text-[10px]">
                      {locale === "ar"
                        ? art.category.nameAr
                        : art.category.nameEn}
                    </Badge>
                  )}
                  {art.isFeatured && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-semibold">
                      <Star className="size-3 fill-amber-500" />
                      {t("featured")}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {locale === "ar" ? art.titleAr : art.titleEn}
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {locale === "ar"
                    ? art.excerptAr || art.contentAr
                    : art.excerptEn || art.contentEn}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 font-mono">
                  <Eye className="size-3" />
                  <span>{art.viewCount}</span>
                </span>
                <span className="text-[11px]">
                  {formatRelativeTime(new Date(art.createdAt), locale)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
