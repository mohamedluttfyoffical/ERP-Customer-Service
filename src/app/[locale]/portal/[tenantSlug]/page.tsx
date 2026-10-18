import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Search,
  Plus,
  BookOpen,
  ArrowRight,
  FolderTree,
  Eye,
  Star,
  Ticket,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";

interface PortalHomePageProps {
  params: Promise<{
    locale: string;
    tenantSlug: string;
  }>;
  searchParams: Promise<{
    q?: string;
  }>;
}

export default async function PortalHomePage(props: PortalHomePageProps) {
  const { locale, tenantSlug } = await props.params;
  const search = await props.searchParams;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, name: true, slug: true },
  });

  if (!tenant) {
    notFound();
  }

  const t = await getTranslations("Portal");

  // Fetch featured articles and published categories
  const [featuredArticles, categories] = await Promise.all([
    prisma.kbArticle.findMany({
      where: {
        tenantId: tenant.id,
        status: "PUBLISHED",
      },
      include: {
        category: {
          select: { nameAr: true, nameEn: true, slug: true },
        },
      },
      orderBy: [{ isFeatured: "desc" }, { viewCount: "desc" }],
      take: 6,
    }),
    prisma.kbCategory.findMany({
      where: {
        tenantId: tenant.id,
        isPublished: true,
      },
      include: {
        _count: {
          select: {
            articles: {
              where: { status: "PUBLISHED" },
            },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
      take: 8,
    }),
  ]);

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-primary/[0.07] via-background to-background py-16 px-4 text-center">
        <div className="mx-auto max-w-3xl space-y-4">
          <Badge
            variant="outline"
            className="border-primary/25 bg-primary/10 text-primary text-xs font-semibold px-3 py-1"
          >
            {t("hero.badge", { tenantName: tenant.name })}
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            {t("hero.subtitle")}
          </p>

          {/* Search Form */}
          <form
            action={`/${locale}/portal/${tenantSlug}/kb`}
            method="GET"
            className="mx-auto mt-6 max-w-xl relative flex items-center"
          >
            <Search className="absolute start-4 size-4 text-muted-foreground" />
            <input
              type="text"
              name="q"
              defaultValue={search.q || ""}
              placeholder={t("hero.searchPlaceholder")}
              className="w-full rounded-2xl border border-border bg-card ps-11 pe-28 py-3.5 text-xs sm:text-sm shadow-md focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <button
              type="submit"
              className="absolute end-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t("hero.searchButton")}
            </button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 space-y-12">
        {/* Quick Action Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link
            href={`/portal/${tenantSlug}/tickets/new`}
            className="group rounded-2xl border border-border bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary mb-4 transition-transform group-hover:scale-105">
              <Plus className="size-6" />
            </span>
            <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
              {t("quickActions.submitTitle")}
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              {t("quickActions.submitDescription")}
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
              <span>{t("quickActions.submitCta")}</span>
              <ArrowRight className="size-3.5 ltr:rotate-0 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </div>
          </Link>

          <Link
            href={`/portal/${tenantSlug}/tickets`}
            className="group rounded-2xl border border-border bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4 transition-transform group-hover:scale-105">
              <Ticket className="size-6" />
            </span>
            <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
              {t("quickActions.trackTitle")}
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              {t("quickActions.trackDescription")}
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>{t("quickActions.trackCta")}</span>
              <ArrowRight className="size-3.5 ltr:rotate-0 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </div>
          </Link>

          <Link
            href={`/portal/${tenantSlug}/kb`}
            className="group rounded-2xl border border-border bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-4 transition-transform group-hover:scale-105">
              <BookOpen className="size-6" />
            </span>
            <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
              {t("quickActions.kbTitle")}
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              {t("quickActions.kbDescription")}
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <span>{t("quickActions.kbCta")}</span>
              <ArrowRight className="size-3.5 ltr:rotate-0 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </div>
          </Link>
        </section>

        {/* Categories Section */}
        {categories.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h2 className="text-lg font-bold">{t("categoriesTitle")}</h2>
                <p className="text-xs text-muted-foreground">
                  {t("categoriesSubtitle")}
                </p>
              </div>
              <Link
                href={`/portal/${tenantSlug}/kb`}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {t("viewAllCategories")}
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/portal/${tenantSlug}/kb?category=${cat.slug}`}
                  className="group rounded-2xl border border-border/80 bg-card p-4 text-center transition-all hover:border-primary/40 hover:shadow-xs"
                >
                  <FolderTree className="mx-auto size-7 text-primary/70 transition-transform group-hover:scale-110" />
                  <h4 className="mt-2 text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    {locale === "ar" ? cat.nameAr : cat.nameEn}
                  </h4>
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    {cat._count.articles} {t("articlesUnit")}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured Articles Section */}
        {featuredArticles.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h2 className="text-lg font-bold">{t("featuredTitle")}</h2>
                <p className="text-xs text-muted-foreground">
                  {t("featuredSubtitle")}
                </p>
              </div>
              <Link
                href={`/portal/${tenantSlug}/kb`}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {t("viewAllArticles")}
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredArticles.map((art) => (
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
                          {t("featuredBadge")}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {locale === "ar" ? art.titleAr : art.titleEn}
                    </h4>
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                      {locale === "ar"
                        ? art.excerptAr || art.contentAr
                        : art.excerptEn || art.contentEn}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-mono">
                      <Eye className="size-3" />
                      <span>{art.viewCount}</span>
                    </span>
                    <span className="flex items-center gap-1 text-primary font-semibold">
                      <span>{t("readArticle")}</span>
                      <ArrowRight className="size-3 ltr:rotate-0 rtl:rotate-180" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
