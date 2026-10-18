"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("Theme");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size={compact ? "icon-sm" : "icon"}
        aria-label={t("toggle")}
        disabled
        className="text-muted-foreground"
      >
        <Sun aria-hidden="true" className="size-4 opacity-40" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size={compact ? "icon-sm" : "icon"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={t("toggle")}
      title={isDark ? t("light") : t("dark")}
      className="text-muted-foreground hover:text-foreground"
    >
      {isDark ? (
        <Sun aria-hidden="true" className="size-4" />
      ) : (
        <Moon aria-hidden="true" className="size-4" />
      )}
    </Button>
  );
}
