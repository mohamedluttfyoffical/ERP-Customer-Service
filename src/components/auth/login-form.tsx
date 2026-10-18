"use client";

import { useActionState, useState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { loginAction } from "@/lib/auth/actions";
import { initialAuthActionState } from "@/lib/auth/action-types";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { Spinner } from "@/components/ui/spinner";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const locale = useLocale();
  const t = useTranslations("Auth.login");
  const common = useTranslations("Common");
  const root = useTranslations();
  const [state, formAction, pending] = useActionState(loginAction, initialAuthActionState);
  const [email, setEmail] = useState("");

  const translateError = (key?: string) => {
    if (!key) {
      return null;
    }
    return root.has(key) ? root(key) : root("Auth.errors.generic");
  };

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {state.formError ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/[0.05] px-3.5 py-3 text-[13px] text-destructive"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{translateError(state.formError)}</span>
        </div>
      ) : null}

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
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          required
        />
        {state.fieldErrors?.email ? (
          <p id="email-error" className="text-xs text-destructive">
            {translateError(state.fieldErrors.email)}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{common("password")}</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder={t("passwordPlaceholder")}
          showLabel={common("open")}
          hideLabel={common("close")}
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
          required
        />
        {state.fieldErrors?.password ? (
          <p id="password-error" className="text-xs text-destructive">
            {translateError(state.fieldErrors.password)}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="h-10 w-full" disabled={pending}>
        {pending ? <Spinner /> : null}
        {pending ? t("submitting") : t("submit")}
        {!pending ? <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" /> : null}
      </Button>

      <p className="pt-1 text-center text-xs text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t("createAccount")}
        </Link>
      </p>
    </form>
  );
}
