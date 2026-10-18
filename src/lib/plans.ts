/**
 * Canonical SaaS plan catalogue.
 *
 * This file is the single source of truth for both the marketing pricing table
 * and the database seed. Prices are stored as decimal strings so that no float
 * rounding can leak into Stripe or invoice amounts. The database remains the
 * runtime source of truth once seeded; changing prices here should be paired
 * with a migration/seed update.
 */

export const PLAN_CODES = ["STARTER", "PROFESSIONAL", "ENTERPRISE"] as const;

export type PlanCode = (typeof PLAN_CODES)[number];

export const USAGE_METRICS = [
  "AGENTS",
  "TICKETS_PER_MONTH",
  "STORAGE_MB",
  "DEPARTMENTS",
  "KNOWLEDGE_BASE_ARTICLES",
  "MONTHLY_ACTIVE_CUSTOMERS",
] as const;

export type UsageMetricKey = (typeof USAGE_METRICS)[number];

export type PlanFeatureKey =
  | "core_helpdesk"
  | "email_channel"
  | "portal_kb"
  | "work_orders_assets"
  | "advanced_sla"
  | "realtime_chat"
  | "internal_collaboration"
  | "custom_fields"
  | "csat_reports"
  | "api_access"
  | "sso_saml"
  | "audit_logs"
  | "priority_support"
  | "dedicated_csm";

export interface PlanFeatureDefinition {
  key: PlanFeatureKey;
  nameAr: string;
  nameEn: string;
  description: string;
}

export interface PlanDefinition {
  code: PlanCode;
  tier: number;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  trialDays: number;
  annualDiscountPercent: string;
  isPopular: boolean;
  sortOrder: number;
  /** Fixed platform price in minor-unit-safe decimal string form. */
  prices: {
    MONTHLY: string;
    ANNUAL: string;
  };
  limits: Record<UsageMetricKey, number | null>;
  features: PlanFeatureKey[];
}

export const PLAN_FEATURES: Record<PlanFeatureKey, PlanFeatureDefinition> = {
  core_helpdesk: {
    key: "core_helpdesk",
    nameAr: "مكتب تذاكر متكامل",
    nameEn: "Complete helpdesk",
    description: "Ticketing, assignments, tags, canned responses and attachments.",
  },
  email_channel: {
    key: "email_channel",
    nameAr: "قناة البريد الإلكتروني",
    nameEn: "Email channel",
    description: "Inbound email-to-ticket and outbound replies.",
  },
  portal_kb: {
    key: "portal_kb",
    nameAr: "بوابة العملاء وقاعدة المعرفة",
    nameEn: "Customer portal & knowledge base",
    description: "Branded self-service portal with bilingual articles and FAQs.",
  },
  work_orders_assets: {
    key: "work_orders_assets",
    nameAr: "أوامر العمل والأصول",
    nameEn: "Work orders & assets",
    description: "Asset registry, maintenance plans, quotations and service invoices.",
  },
  advanced_sla: {
    key: "advanced_sla",
    nameAr: "سياسات SLA متقدمة",
    nameEn: "Advanced SLA policies",
    description: "Business calendars, per-priority targets and escalations.",
  },
  realtime_chat: {
    key: "realtime_chat",
    nameAr: "المحادثة الفورية",
    nameEn: "Real-time live chat",
    description: "Website chat widget with real-time agent responses.",
  },
  internal_collaboration: {
    key: "internal_collaboration",
    nameAr: "التعاون الداخلي والإشارات",
    nameEn: "Internal collaboration & mentions",
    description: "Private notes, @mentions and team notifications.",
  },
  custom_fields: {
    key: "custom_fields",
    nameAr: "حقول التذاكر المخصصة",
    nameEn: "Custom ticket fields",
    description: "Tenant-defined fields with typed values and department scoping.",
  },
  csat_reports: {
    key: "csat_reports",
    nameAr: "تقارير الرضا والأداء",
    nameEn: "CSAT & performance reporting",
    description: "SLA compliance, CSAT and agent-performance dashboards.",
  },
  api_access: {
    key: "api_access",
    nameAr: "واجهة برمجة التطبيقات",
    nameEn: "API access",
    description: "Authenticated REST API for ERP and external integrations.",
  },
  sso_saml: {
    key: "sso_saml",
    nameAr: "الدخول الموحد SSO",
    nameEn: "SAML single sign-on",
    description: "Enterprise identity-provider integration and enforced SSO.",
  },
  audit_logs: {
    key: "audit_logs",
    nameAr: "سجلات التدقيق",
    nameEn: "Audit logs",
    description: "Immutable audit trail with export support.",
  },
  priority_support: {
    key: "priority_support",
    nameAr: "دعم ذو أولوية",
    nameEn: "Priority support",
    description: "Faster platform support response targets.",
  },
  dedicated_csm: {
    key: "dedicated_csm",
    nameAr: "مدير نجاح مخصص",
    nameEn: "Dedicated success manager",
    description: "A named success manager and quarterly business reviews.",
  },
};

export const PLAN_CATALOG: readonly PlanDefinition[] = [
  {
    code: "STARTER",
    tier: 1,
    nameAr: "البداية",
    nameEn: "Starter",
    descriptionAr: "لفرق الدعم الصغيرة التي تبدأ أول تجربة منظمة لخدمة العملاء.",
    descriptionEn: "For growing teams standardizing customer support for the first time.",
    trialDays: 14,
    annualDiscountPercent: "16.67",
    isPopular: false,
    sortOrder: 10,
    prices: { MONTHLY: "49.00", ANNUAL: "490.00" },
    limits: {
      AGENTS: 3,
      TICKETS_PER_MONTH: 500,
      STORAGE_MB: 5120,
      DEPARTMENTS: 2,
      KNOWLEDGE_BASE_ARTICLES: 50,
      MONTHLY_ACTIVE_CUSTOMERS: 500,
    },
    features: [
      "core_helpdesk",
      "email_channel",
      "portal_kb",
      "work_orders_assets",
      "realtime_chat",
      "internal_collaboration",
    ],
  },
  {
    code: "PROFESSIONAL",
    tier: 2,
    nameAr: "الاحترافية",
    nameEn: "Professional",
    descriptionAr: "للفرق المتوسطة التي تحتاج إلى SLA متقدم وتقارير تشغيلية وربط ERP.",
    descriptionEn: "For scaling teams that need advanced SLAs, analytics and ERP operations.",
    trialDays: 14,
    annualDiscountPercent: "16.67",
    isPopular: true,
    sortOrder: 20,
    prices: { MONTHLY: "149.00", ANNUAL: "1490.00" },
    limits: {
      AGENTS: 15,
      TICKETS_PER_MONTH: 5000,
      STORAGE_MB: 51200,
      DEPARTMENTS: 10,
      KNOWLEDGE_BASE_ARTICLES: 500,
      MONTHLY_ACTIVE_CUSTOMERS: 5000,
    },
    features: [
      "core_helpdesk",
      "email_channel",
      "portal_kb",
      "work_orders_assets",
      "advanced_sla",
      "realtime_chat",
      "internal_collaboration",
      "custom_fields",
      "csat_reports",
      "api_access",
      "audit_logs",
      "priority_support",
    ],
  },
  {
    code: "ENTERPRISE",
    tier: 3,
    nameAr: "المؤسسات",
    nameEn: "Enterprise",
    descriptionAr: "للمؤسسات متعددة الفروع مع متطلبات أمان وامتثال وتوسّع غير محدودة.",
    descriptionEn: "For multi-branch organizations with security, compliance and scale needs.",
    trialDays: 14,
    annualDiscountPercent: "16.67",
    isPopular: false,
    sortOrder: 30,
    prices: { MONTHLY: "399.00", ANNUAL: "3990.00" },
    limits: {
      AGENTS: null,
      TICKETS_PER_MONTH: null,
      STORAGE_MB: null,
      DEPARTMENTS: null,
      KNOWLEDGE_BASE_ARTICLES: null,
      MONTHLY_ACTIVE_CUSTOMERS: null,
    },
    features: [
      "core_helpdesk",
      "email_channel",
      "portal_kb",
      "work_orders_assets",
      "advanced_sla",
      "realtime_chat",
      "internal_collaboration",
      "custom_fields",
      "csat_reports",
      "api_access",
      "sso_saml",
      "audit_logs",
      "priority_support",
      "dedicated_csm",
    ],
  },
];

export const HIGHLIGHTED_PLAN = PLAN_CATALOG.find((plan) => plan.isPopular) ?? PLAN_CATALOG[0];

export function getPlanByCode(code: PlanCode): PlanDefinition {
  const plan = PLAN_CATALOG.find((candidate) => candidate.code === code);
  if (!plan) {
    throw new Error(`Unknown plan code: ${code}`);
  }
  return plan;
}

/**
 * Annual plans are billed once for ten months: two months are free.
 * The explicit annual amount is still stored in PlanPrice so gateway price
 * objects can never diverge from the displayed price.
 */
export function calculateAnnualSavings(monthlyAmount: string, annualAmount: string) {
  const monthly = Number(monthlyAmount);
  const annual = Number(annualAmount);
  if (!Number.isFinite(monthly) || !Number.isFinite(annual) || monthly <= 0) {
    return { amount: "0.00", percent: "0.00" };
  }
  const saved = monthly * 12 - annual;
  return {
    amount: saved.toFixed(2),
    percent: ((saved / (monthly * 12)) * 100).toFixed(2),
  };
}
