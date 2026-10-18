const DEFAULT_LOCALE = "ar-SA";

export function formatCurrency(
  amount: number | string,
  currency = "USD",
  locale = DEFAULT_LOCALE,
): string {
  const numericAmount = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(numericAmount)) {
    return "—";
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

export function formatNumber(value: number, locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatPercent(value: number, locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDateTime(
  value: Date | string | null | undefined,
  locale = DEFAULT_LOCALE,
): string {
  if (!value) {
    return "—";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function formatRelativeTime(
  value: Date | string | null | undefined,
  locale = DEFAULT_LOCALE,
): string {
  if (!value) {
    return "—";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const normalizedLocale =
    locale === "ar" ? "ar-SA" : locale === "en" ? "en-US" : locale;
  const rtf = new Intl.RelativeTimeFormat(normalizedLocale, {
    numeric: "auto",
  });

  const absSec = Math.abs(diffSec);
  if (absSec < 60) {
    return rtf.format(diffSec, "second");
  }
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, "minute");
  }
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) {
    return rtf.format(diffHour, "hour");
  }
  const diffDay = Math.round(diffHour / 24);
  if (Math.abs(diffDay) < 30) {
    return rtf.format(diffDay, "day");
  }
  const diffMonth = Math.round(diffDay / 30);
  if (Math.abs(diffMonth) < 12) {
    return rtf.format(diffMonth, "month");
  }
  const diffYear = Math.round(diffDay / 365);
  return rtf.format(diffYear, "year");
}
