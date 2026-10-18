import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";
import { safeRedirectPath } from "@/lib/auth/validation";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return { title: t("loginTitle") };
}

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (user) {
    redirect(`/${locale}/app`);
  }

  const rawCallback = Array.isArray(query.callbackUrl) ? query.callbackUrl[0] : query.callbackUrl;
  const callbackUrl = safeRedirectPath(rawCallback ?? "", `/${locale}/app`);
  const t = await getTranslations("Auth.login");

  return (
    <div>
      <p className="font-mono text-[10px] font-medium tracking-[0.16em] text-primary uppercase">
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-7">
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
