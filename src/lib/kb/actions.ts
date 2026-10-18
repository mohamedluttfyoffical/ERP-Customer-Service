"use server";

import { revalidatePath } from "next/cache";
import { type KnowledgeStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getTenantAccess, hasTenantPermission } from "@/lib/tenants/context";
import { assertUsageLimit } from "@/lib/billing/gating";
import { slugify } from "@/lib/kb/slug";

export type KbActionResult =
  | { success: true; entityId?: string; message?: string }
  | { success: false; error: string };

export async function createKbCategoryAction(params: {
  tenantSlug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  locale: string;
}): Promise<KbActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    if (!hasTenantPermission(access, "kb:write")) {
      return { success: false, error: "Settings.errors.forbidden" };
    }

    const baseSlug = slugify(params.nameEn) || `cat-${Date.now().toString(36)}`;
    let slug = baseSlug;
    let counter = 1;

    while (
      await prisma.kbCategory.findUnique({
        where: {
          tenantId_slug: {
            tenantId: access.tenant.id,
            slug,
          },
        },
      })
    ) {
      slug = `${baseSlug}-${counter++}`;
    }

    const category = await prisma.kbCategory.create({
      data: {
        tenantId: access.tenant.id,
        slug,
        nameAr: params.nameAr.trim(),
        nameEn: params.nameEn.trim(),
        descriptionAr: params.descriptionAr?.trim() || null,
        descriptionEn: params.descriptionEn?.trim() || null,
        isPublished: true,
      },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/kb`);
    revalidatePath(`/${params.locale}/portal/${params.tenantSlug}/kb`);

    return { success: true, entityId: category.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create category.",
    };
  }
}

export async function createKbArticleAction(params: {
  tenantSlug: string;
  categoryId?: string | null;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  excerptAr?: string | null;
  excerptEn?: string | null;
  status?: KnowledgeStatus;
  isFeatured?: boolean;
  locale: string;
}): Promise<KbActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    const requiredPermission =
      params.status === "PUBLISHED" ? "kb:publish" : "kb:write";

    if (!hasTenantPermission(access, requiredPermission)) {
      return { success: false, error: "Settings.errors.forbidden" };
    }

    // Gating check on knowledge base articles quota limit
    await assertUsageLimit(access.tenant.id, "KNOWLEDGE_BASE_ARTICLES", 1);

    const baseSlug = slugify(params.titleEn) || `art-${Date.now().toString(36)}`;
    let slug = baseSlug;
    let counter = 1;

    while (
      await prisma.kbArticle.findUnique({
        where: {
          tenantId_slug: {
            tenantId: access.tenant.id,
            slug,
          },
        },
      })
    ) {
      slug = `${baseSlug}-${counter++}`;
    }

    const status = params.status ?? "DRAFT";
    const publishedAt = status === "PUBLISHED" ? new Date() : null;

    const article = await prisma.kbArticle.create({
      data: {
        tenantId: access.tenant.id,
        categoryId: params.categoryId || null,
        authorUserId: access.user.id,
        slug,
        titleAr: params.titleAr.trim(),
        titleEn: params.titleEn.trim(),
        excerptAr: params.excerptAr?.trim() || null,
        excerptEn: params.excerptEn?.trim() || null,
        contentAr: params.contentAr.trim(),
        contentEn: params.contentEn.trim(),
        status,
        isFeatured: params.isFeatured ?? false,
        publishedAt,
      },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/kb`);
    revalidatePath(`/${params.locale}/portal/${params.tenantSlug}/kb`);

    return { success: true, entityId: article.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create article.",
    };
  }
}

export async function updateKbArticleStatusAction(params: {
  tenantSlug: string;
  articleId: string;
  status: KnowledgeStatus;
  locale: string;
}): Promise<KbActionResult> {
  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);

    if (!hasTenantPermission(access, "kb:publish")) {
      return { success: false, error: "Settings.errors.forbidden" };
    }

    const article = await prisma.kbArticle.findFirst({
      where: { id: params.articleId, tenantId: access.tenant.id },
    });

    if (!article) {
      return { success: false, error: "Article not found." };
    }

    const publishedAt =
      params.status === "PUBLISHED" && !article.publishedAt
        ? new Date()
        : article.publishedAt;

    await prisma.kbArticle.update({
      where: { id: article.id },
      data: {
        status: params.status,
        publishedAt,
      },
    });

    revalidatePath(`/${params.locale}/app/${params.tenantSlug}/kb`);
    revalidatePath(`/${params.locale}/portal/${params.tenantSlug}/kb`);

    return { success: true, entityId: article.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update article status.",
    };
  }
}

export async function submitArticleFeedbackAction(params: {
  tenantSlug: string;
  articleId: string;
  isHelpful: boolean;
  comment?: string | null;
  locale: string;
}): Promise<KbActionResult> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.tenantSlug },
      select: { id: true },
    });

    if (!tenant) {
      return { success: false, error: "Tenant not found." };
    }

    await prisma.kbArticleFeedback.create({
      data: {
        tenantId: tenant.id,
        articleId: params.articleId,
        isHelpful: params.isHelpful,
        comment: params.comment?.trim() || null,
      },
    });

    // Update helpful or not helpful counter atomically
    await prisma.kbArticle.update({
      where: { id: params.articleId },
      data: {
        helpfulCount: params.isHelpful ? { increment: 1 } : undefined,
        notHelpfulCount: !params.isHelpful ? { increment: 1 } : undefined,
      },
    });

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to submit feedback.",
    };
  }
}
