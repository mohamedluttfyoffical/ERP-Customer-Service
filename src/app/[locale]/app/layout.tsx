import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type AppLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AppLayout({ children, params }: AppLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUser(locale);
  return children;
}
