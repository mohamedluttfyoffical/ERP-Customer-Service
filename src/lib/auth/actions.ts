"use server";

import { Prisma } from "@prisma/client";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import {
  loginSchema,
  registrationSchema,
  fieldErrorsFromZod,
  getFormValue,
  safeRedirectPath,
  type SupportedLocale,
} from "@/lib/auth/validation";
import type { AuthActionState } from "@/lib/auth/action-types";
import { provisionTenant, TenantProvisioningError } from "@/lib/tenants/provision";

function normalizeLocale(value: string): SupportedLocale {
  return value === "en" ? "en" : "ar";
}

async function getClientIp(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || requestHeaders.get("x-real-ip") || "unknown").slice(0, 64);
}

function errorState(fieldErrors: Record<string, string>): AuthActionState {
  return { status: "error", fieldErrors };
}

function signInResultHasError(result: unknown): boolean {
  if (typeof result !== "string") {
    return false;
  }
  try {
    return new URL(result, "https://app.invalid").searchParams.has("error");
  } catch {
    return false;
  }
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const locale = normalizeLocale(getFormValue(formData, "locale"));
  const fallback = `/${locale}/app`;
  const callbackUrl = safeRedirectPath(getFormValue(formData, "callbackUrl"), fallback);

  const limit = consumeRateLimit(`login:${await getClientIp()}`, {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) {
    return {
      status: "error",
      formError: "Auth.errors.rateLimited",
    };
  }

  const parsed = loginSchema.safeParse({
    email: getFormValue(formData, "email"),
    password: getFormValue(formData, "password"),
  });

  if (!parsed.success) {
    return errorState(fieldErrorsFromZod(parsed.error));
  }

  try {
    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    if (signInResultHasError(result)) {
      return {
        status: "error",
        formError: "Auth.errors.invalidCredentials",
      };
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        status: "error",
        formError: "Auth.errors.invalidCredentials",
      };
    }
    throw error;
  }

  redirect(callbackUrl);
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const limit = consumeRateLimit(`register:${await getClientIp()}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return { status: "error", formError: "Auth.errors.rateLimited" };
  }

  const parsed = registrationSchema.safeParse({
    companyName: getFormValue(formData, "companyName"),
    slug: getFormValue(formData, "slug"),
    fullName: getFormValue(formData, "fullName"),
    email: getFormValue(formData, "email"),
    password: getFormValue(formData, "password"),
    confirmPassword: getFormValue(formData, "confirmPassword"),
    acceptTerms: getFormValue(formData, "acceptTerms"),
    plan: getFormValue(formData, "plan"),
    interval: getFormValue(formData, "interval"),
    locale: getFormValue(formData, "locale") || "ar",
  });

  if (!parsed.success) {
    return errorState(fieldErrorsFromZod(parsed.error));
  }

  const input = parsed.data;

  const [existingUser, existingTenant] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email }, select: { id: true } }),
    prisma.tenant.findUnique({ where: { slug: input.slug }, select: { id: true } }),
  ]);

  const errors: Record<string, string> = {};
  if (existingUser) {
    errors.email = "Validation.emailTaken";
  }
  if (existingTenant) {
    errors.slug = "Validation.slugTaken";
  }
  if (Object.keys(errors).length > 0) {
    return errorState(errors);
  }

  const passwordHash = await hashPassword(input.password);

  let slug: string;
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            email: input.email,
            name: input.fullName,
            passwordHash,
            locale: input.locale === "ar" ? "AR" : "EN",
            isActive: true,
            platformRole: "USER",
          },
        });

        return provisionTenant(tx, {
          ownerUserId: user.id,
          ownerName: input.fullName,
          companyName: input.companyName,
          slug: input.slug,
          email: input.email,
          locale: input.locale,
          planCode: input.plan,
          interval: input.interval,
        });
      },
      { maxWait: 5_000, timeout: 20_000 },
    );
    slug = result.slug;
  } catch (error) {
    if (error instanceof TenantProvisioningError) {
      return { status: "error", formError: "Auth.errors.planUnavailable" };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        status: "error",
        formError: "Auth.errors.accountAlreadyExists",
      };
    }
    console.error("[register] workspace provisioning failed", error);
    return { status: "error", formError: "Auth.errors.generic" };
  }

  try {
    const result = await signIn("credentials", {
      email: input.email,
      password: input.password,
      redirect: false,
    });

    if (signInResultHasError(result)) {
      return {
        status: "error",
        formError: "Auth.errors.accountCreatedSignInFailed",
      };
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        status: "error",
        formError: "Auth.errors.accountCreatedSignInFailed",
      };
    }
    throw error;
  }

  redirect(`/${input.locale}/app/${slug}`);
}

export async function logoutAction(formData: FormData): Promise<void> {
  const locale = normalizeLocale(getFormValue(formData, "locale"));
  await signOut({ redirectTo: `/${locale}` });
}
