import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/auth/session";
import { HIGHLIGHTED_PLAN, PLAN_CATALOG, type PlanCode } from "@/lib/plans";

type RegisterPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    plan?: string | string[];
    interval?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

function getParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return { title: t("registerTitle") };
}

export default async function RegisterPage({ params, searchParams }: RegisterPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (user) {
    redirect(`/${locale}/app`);
  }

  const requestedPlan = getParam(query.plan);
  const plan =
    PLAN_CATALOG.find((candidate) => candidate.code === requestedPlan) ?? HIGHLIGHTED_PLAN;
  const planCode = plan.code as PlanCode;
  const interval = getParam(query.interval) === "ANNUAL" ? "ANNUAL" : "MONTHLY";
  const planName = locale === "ar" ? plan.nameAr : plan.nameEn;
  const t = await getTranslations("Auth.register");

  return (
    <div>
      <p className="font-mono text-[10px] font-medium tracking-[0.16em] text-primary uppercase">
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-7">
        <RegisterForm planCode={planCode} planName={planName} interval={interval} />
      </div>
    </div>
  );
}
