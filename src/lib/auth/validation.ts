import { z } from "zod";

import { PLAN_CODES } from "@/lib/plans";

export const LOCALES = ["ar", "en"] as const;
export type SupportedLocale = (typeof LOCALES)[number];

export const RESERVED_TENANT_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "ar",
  "auth",
  "billing",
  "blog",
  "dashboard",
  "docs",
  "en",
  "help",
  "login",
  "mail",
  "platform",
  "pricing",
  "register",
  "root",
  "status",
  "support",
  "system",
  "terms",
  "www",
]);

const passwordSchema = z
  .string({ message: "Validation.passwordRequired" })
  .min(12, "Validation.passwordLength")
  .max(72, "Validation.passwordLength")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "Validation.passwordLength")
  .refine((value) => /[A-Za-z]/.test(value), "Validation.passwordLetter")
  .refine((value) => /[0-9]/.test(value), "Validation.passwordNumber");

const emailSchema = z
  .string({ message: "Validation.emailRequired" })
  .trim()
  .toLowerCase()
  .email("Validation.emailInvalid")
  .max(320, "Validation.emailInvalid");

const localeSchema = z.enum(LOCALES).catch("ar");

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ message: "Validation.passwordRequired" })
    .min(1, "Validation.passwordRequired"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registrationSchema = z
  .object({
    companyName: z
      .string({ message: "Validation.companyRequired" })
      .trim()
      .min(2, "Validation.companyLength")
      .max(200, "Validation.companyLength"),
    slug: z
      .string({ message: "Validation.slugRequired" })
      .trim()
      .toLowerCase()
      .min(3, "Validation.slugLength")
      .max(40, "Validation.slugLength")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Validation.slugFormat")
      .refine((value) => !RESERVED_TENANT_SLUGS.has(value), "Validation.slugReserved"),
    fullName: z
      .string({ message: "Validation.nameRequired" })
      .trim()
      .min(2, "Validation.nameLength")
      .max(120, "Validation.nameLength"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string({ message: "Validation.confirmRequired" }),
    acceptTerms: z.literal("on", { message: "Validation.termsRequired" }),
    plan: z.enum(PLAN_CODES, { message: "Validation.planInvalid" }),
    interval: z.enum(["MONTHLY", "ANNUAL"], { message: "Validation.intervalInvalid" }),
    locale: localeSchema,
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Validation.passwordMismatch",
        path: ["confirmPassword"],
      });
    }
  });

export type RegistrationInput = z.infer<typeof registrationSchema>;

export function getFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Accepts only same-origin relative paths. Blocks protocol-relative URLs,
 * backslash tricks, API/Auth endpoints, and traversal attempts.
 */
export function safeRedirectPath(value: string, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  let parsed: URL;
  try {
    parsed = new URL(value, "https://app.invalid");
  } catch {
    return fallback;
  }

  if (parsed.origin !== "https://app.invalid") {
    return fallback;
  }
  if (parsed.pathname.startsWith("/api/") || parsed.pathname.startsWith("/_next/")) {
    return fallback;
  }
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function fieldErrorsFromZod(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}
