"use client";

import { useActionState, useState } from "react";
import { AlertCircle, ArrowRight, Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { registerAction } from "@/lib/auth/actions";
import { initialAuthActionState } from "@/lib/auth/action-types";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { Spinner } from "@/components/ui/spinner";

type RegisterFormProps = {
  planCode: string;
  planName: string;
  interval: "MONTHLY" | "ANNUAL";
};

export function RegisterForm({ planCode, planName, interval }: RegisterFormProps) {
  const locale = useLocale();
  const t = useTranslations("Auth.register");
  const common = useTranslations("Common");
  const root = useTranslations();
  const [state, formAction, pending] = useActionState(registerAction, initialAuthActionState);
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const translateError = (key?: string) => {
    if (!key) {
      return null;
    }
    return root.has(key) ? root(key) : root("Auth.errors.generic");
  };

  const fieldError = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="plan" value={planCode} />
      <input type="hidden" name="interval" value={interval} />

      <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Check aria-hidden="true" className="size-4" strokeWidth={2.6} />
          </span>
          <div>
            <p className="text-[10px] text-muted-foreground">{t("selectedPlan")}</p>
            <p className="text-xs font-semibold">{planName}</p>
          </div>
        </div>
        <div className="text-end">
          <Badge variant="outline" className="bg-background text-[10px]">
            {interval === "ANNUAL" ? t("billingAnnual") : t("billingMonthly")}
          </Badge>
          <a
            href={`/${locale}/#pricing`}
            className="mt-1 block text-[10px] font-medium text-primary hover:underline"
          >
            {t("changePlan")}
          </a>
        </div>
      </div>

      {state.formError ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/[0.05] px-3.5 py-3 text-[13px] text-destructive"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{translateError(state.formError)}</span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="companyName">{t("company")}</Label>
          <Input
            id="companyName"
            name="companyName"
            autoComplete="organization"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            placeholder={t("companyPlaceholder")}
            aria-invalid={Boolean(fieldError("companyName"))}
            required
          />
          {fieldError("companyName") ? (
            <p className="text-xs text-destructive">{translateError(fieldError("companyName"))}</p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="slug">{t("slug")}</Label>
          <div className="flex overflow-hidden rounded-lg border border-input bg-background shadow-xs focus-within:border-primary/50 focus-within:ring-[3px] focus-within:ring-ring/20">
            <span
              dir="ltr"
              className="hidden items-center border-e border-border/70 bg-muted/60 px-2.5 font-mono text-[10px] text-muted-foreground sm:flex"
            >
              /{locale}/app/
            </span>
            <Input
              id="slug"
              name="slug"
              dir="ltr"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={slug}
              onChange={(event) => setSlug(event.target.value.toLowerCase())}
              placeholder={t("slugPlaceholder")}
              aria-invalid={Boolean(fieldError("slug"))}
              className="rounded-none border-0 shadow-none focus-visible:ring-0"
              required
            />
          </div>
          {fieldError("slug") ? (
            <p className="text-xs text-destructive">{translateError(fieldError("slug"))}</p>
          ) : (
            <p className="text-[10px] leading-5 text-muted-foreground">{t("slugHint")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">{t("fullName")}</Label>
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder={t("fullNamePlaceholder")}
            aria-invalid={Boolean(fieldError("fullName"))}
            required
          />
          {fieldError("fullName") ? (
            <p className="text-xs text-destructive">{translateError(fieldError("fullName"))}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{common("email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("emailPlaceholder")}
            aria-invalid={Boolean(fieldError("email"))}
            required
          />
          {fieldError("email") ? (
            <p className="text-xs text-destructive">{translateError(fieldError("email"))}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{common("password")}</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            aria-invalid={Boolean(fieldError("password"))}
            showLabel={common("open")}
            hideLabel={common("close")}
            required
          />
          {fieldError("password") ? (
            <p className="text-xs text-destructive">{translateError(fieldError("password"))}</p>
          ) : (
            <p className="text-[10px] leading-5 text-muted-foreground">{t("passwordHint")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            aria-invalid={Boolean(fieldError("confirmPassword"))}
            showLabel={common("open")}
            hideLabel={common("close")}
            required
          />
          {fieldError("confirmPassword") ? (
            <p className="text-xs text-destructive">
              {translateError(fieldError("confirmPassword"))}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-6 text-muted-foreground">
          <input
            type="checkbox"
            name="acceptTerms"
            aria-invalid={Boolean(fieldError("acceptTerms"))}
            className="mt-1 size-4 shrink-0 rounded border-input accent-primary"
          />
          <span>{t("terms")}</span>
        </label>
        {fieldError("acceptTerms") ? (
          <p className="text-xs text-destructive">{translateError(fieldError("acceptTerms"))}</p>
        ) : null}
      </div>

      <p className="text-center text-[10px] text-muted-foreground">{t("trialNote")}</p>

      <Button type="submit" className="h-10 w-full" disabled={pending}>
        {pending ? <Spinner /> : null}
        {pending ? t("submitting") : t("submit")}
        {!pending ? <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" /> : null}
      </Button>

      <p className="pt-1 text-center text-xs text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}
