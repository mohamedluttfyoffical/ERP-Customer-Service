"use client";

import { useActionState, useEffect } from "react";
import { Save } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { updateTenantProfileAction } from "@/lib/tenants/actions";
import { initialProfileActionState } from "@/lib/auth/action-types";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

type ProfileFormProps = {
  tenantSlug: string;
  initialValues: {
    name: string;
    supportEmail: string;
    supportPhone: string;
  };
  canManage: boolean;
};

export function ProfileForm({ tenantSlug, initialValues, canManage }: ProfileFormProps) {
  const locale = useLocale();
  const t = useTranslations("Settings");
  const root = useTranslations();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateTenantProfileAction,
    initialProfileActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(t("saved"));
      router.refresh();
    }
  }, [router, state.status, t]);

  const translateError = (key?: string) => {
    if (!key) {
      return null;
    }
    return root.has(key) ? root(key) : root("Settings.errors.generic");
  };
  const fieldError = (key: string) => state.fieldErrors?.[key];

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="tenantSlug" value={tenantSlug} />

      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/[0.05] px-3.5 py-3 text-[13px] text-destructive"
        >
          {translateError(state.message)}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">{t("companyName")}</Label>
          <Input
            id="name"
            name="name"
            defaultValue={initialValues.name}
            disabled={!canManage}
            aria-invalid={Boolean(fieldError("name"))}
            required
          />
          {fieldError("name") ? (
            <p className="text-xs text-destructive">{translateError(fieldError("name"))}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="supportEmail">{t("supportEmail")}</Label>
          <Input
            id="supportEmail"
            name="supportEmail"
            type="email"
            dir="ltr"
            defaultValue={initialValues.supportEmail}
            disabled={!canManage}
            aria-invalid={Boolean(fieldError("supportEmail"))}
          />
          {fieldError("supportEmail") ? (
            <p className="text-xs text-destructive">{translateError(fieldError("supportEmail"))}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="supportPhone">{t("supportPhone")}</Label>
          <Input
            id="supportPhone"
            name="supportPhone"
            type="tel"
            dir="ltr"
            defaultValue={initialValues.supportPhone}
            disabled={!canManage}
            aria-invalid={Boolean(fieldError("supportPhone"))}
          />
          {fieldError("supportPhone") ? (
            <p className="text-xs text-destructive">{translateError(fieldError("supportPhone"))}</p>
          ) : null}
        </div>
      </div>

      {canManage ? (
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : <Save aria-hidden="true" className="size-4" />}
          {pending ? t("saving") : t("save")}
        </Button>
      ) : (
        <p className="rounded-lg border border-border bg-muted/40 px-3.5 py-3 text-xs text-muted-foreground">
          {t("readOnly")}
        </p>
      )}
    </form>
  );
}
