import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";

import { Providers } from "@/components/providers";
import { routing } from "@/i18n/routing";
import { APP_CONFIG, LOCALE_META } from "@/lib/config";

import "../globals.css";

// Every localized route reads the session (landing header, auth redirects,
// tenant guards and the platform console). Server-render them on demand so no
// authenticated or locale-specific state is ever baked at build time.
export const dynamic = "force-dynamic";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    title: {
      default: t("title"),
      template: `%s | ${locale === "ar" ? APP_CONFIG.nameAr : APP_CONFIG.name}`,
    },
    description: t("description"),
    applicationName: APP_CONFIG.fullName,
    authors: [{ name: APP_CONFIG.fullName }],
    creator: APP_CONFIG.fullName,
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: locale === "ar" ? "ar_SA" : "en_US",
      title: t("title"),
      description: t("description"),
      siteName: APP_CONFIG.fullName,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#15181c" },
  ],
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = LOCALE_META[locale].dir;

  return (
    <html lang={locale} dir={dir} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-dvh overflow-x-hidden">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
