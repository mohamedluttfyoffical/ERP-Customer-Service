"use server";

import { prisma } from "@/lib/db";
import { getTenantAccess } from "@/lib/tenants/context";

export interface SearchResultItem {
  id: string;
  type: "ticket" | "customer" | "kb" | "navigation";
  title: string;
  subtitle?: string;
  href: string;
}

/**
 * Fast multi-tenant search across tickets, customers, and knowledge base articles.
 */
export async function globalSearchAction(params: {
  tenantSlug: string;
  query: string;
  locale: string;
}): Promise<SearchResultItem[]> {
  const q = params.query.trim();
  if (!q) return [];

  try {
    const access = await getTenantAccess(params.locale, params.tenantSlug);
    const tenantId = access.tenant.id;
    const isNum = !isNaN(Number(q));

    const [tickets, customers, articles] = await Promise.all([
      // Search Tickets
      prisma.ticket.findMany({
        where: {
          tenantId,
          OR: [
            ...(isNum ? [{ number: Number(q) }] : []),
            { subject: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          number: true,
          subject: true,
          status: true,
          customer: { select: { name: true } },
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),

      // Search Customers
      prisma.customer.findMany({
        where: {
          tenantId,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        take: 5,
      }),

      // Search KB Articles
      prisma.kbArticle.findMany({
        where: {
          tenantId,
          OR: [
            { titleAr: { contains: q, mode: "insensitive" } },
            { titleEn: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          slug: true,
          titleAr: true,
          titleEn: true,
          status: true,
        },
        take: 5,
      }),
    ]);

    const results: SearchResultItem[] = [];

    // Map Tickets
    for (const t of tickets) {
      results.push({
        id: `ticket-${t.id}`,
        type: "ticket",
        title: `#${t.number} — ${t.subject}`,
        subtitle: `${t.customer?.name || "No customer"} · ${t.status}`,
        href: `/app/${params.tenantSlug}/tickets/${t.number}`,
      });
    }

    // Map Customers
    for (const c of customers) {
      results.push({
        id: `customer-${c.id}`,
        type: "customer",
        title: c.name,
        subtitle: c.email || undefined,
        href: `/app/${params.tenantSlug}/crm?customer=${c.id}`,
      });
    }

    // Map KB Articles
    for (const a of articles) {
      const title = params.locale === "ar" ? a.titleAr : a.titleEn;
      results.push({
        id: `kb-${a.id}`,
        type: "kb",
        title,
        subtitle: a.status,
        href: `/app/${params.tenantSlug}/kb?article=${a.slug}`,
      });
    }

    return results;
  } catch {
    return [];
  }
}
