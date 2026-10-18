export const APP_CONFIG = {
  name: "Sanad",
  nameAr: "سند",
  fullName: "Sanad ERP",
  taglineAr: "منصة متعددة المستأجرين لخدمة العملاء والدعم الفني",
  taglineEn: "Multi-tenant customer service & technical support ERP",
  version: "0.2.0",
  phase: 2,
  supportEmail: "support@sanad.app",
  defaultLocale: "ar",
  locales: ["ar", "en"] as const,
} as const;

export type AppLocale = (typeof APP_CONFIG.locales)[number];

export const LOCALE_META: Record<
  AppLocale,
  { label: string; dir: "rtl" | "ltr"; htmlLang: string }
> = {
  ar: { label: "العربية", dir: "rtl", htmlLang: "ar" },
  en: { label: "English", dir: "ltr", htmlLang: "en" },
};

export const PHASES = [
  { number: 1, titleAr: "البنية التحتية وقاعدة البيانات", status: "complete" },
  { number: 2, titleAr: "المصادقة وتعدد المستأجرين والصلاحيات", status: "current" },
  { number: 3, titleAr: "لوحة مالك المنصة والاشتراكات", status: "upcoming" },
  { number: 4, titleAr: "مساحة العمل والتذاكر وERP", status: "upcoming" },
  { number: 5, titleAr: "بوابة العميل والمعرفة والتحليلات", status: "upcoming" },
] as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
