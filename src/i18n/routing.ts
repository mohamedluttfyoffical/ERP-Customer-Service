import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  localePrefix: "always",
  localeCookie: {
    sameSite: "lax",
  },
});

export type AppLocale = (typeof routing.locales)[number];
