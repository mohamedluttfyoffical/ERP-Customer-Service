import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { PlatformRole } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  locale: "AR" | "EN";
  platformRole: PlatformRole;
  isActive: boolean;
};

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      locale: true,
      platformRole: true,
      isActive: true,
    },
  });

  if (!user?.isActive) {
    return null;
  }

  return user;
});

export async function requireUser(locale: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale === "en" ? "en" : "ar"}/login`);
  }
  return user;
}

export async function requireSuperAdmin(locale: string): Promise<SessionUser> {
  const user = await requireUser(locale);
  if (user.platformRole !== "SUPER_ADMIN") {
    notFound();
  }
  return user;
}
