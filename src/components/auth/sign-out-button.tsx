"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";

import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function SubmitButton({ label, compact }: { label: string; compact?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size={compact ? "sm" : "default"}
      disabled={pending}
      className={cn(
        "justify-start text-muted-foreground hover:text-foreground",
        compact ? "h-8 w-full px-2 text-xs" : "w-full",
      )}
    >
      {pending ? (
        <Spinner className="size-3.5" />
      ) : (
        <LogOut aria-hidden="true" className="size-3.5" />
      )}
      {label}
    </Button>
  );
}

export function SignOutButton({
  locale,
  label,
  compact = false,
}: {
  locale: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <form action={logoutAction}>
      <input type="hidden" name="locale" value={locale} />
      <SubmitButton label={label} compact={compact} />
    </form>
  );
}
