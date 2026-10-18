/**
 * Generates URL-friendly slugs for knowledge base categories and articles.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Calculates positive helpfulness percentage for KB articles.
 */
export function calculateHelpfulnessPercentage(
  helpfulCount: number,
  notHelpfulCount: number
): number | null {
  const total = helpfulCount + notHelpfulCount;
  if (total === 0) return null;
  return Math.round((helpfulCount / total) * 100);
}
