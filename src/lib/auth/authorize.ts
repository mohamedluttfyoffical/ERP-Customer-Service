import type { User } from "next-auth";

import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/auth/validation";

/**
 * Precomputed hash used to keep response timing similar when the email does
 * not exist. Never a real credential.
 */
const DUMMY_HASH = "$2b$12$oj8tfNpEPORoWfpii8ekOetmjGDKdEwqzJ7uPfcCtez..2k6jTLT2";
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const ACCOUNT_LOCK_MINUTES = 15;

function requestMetadata(request?: Request) {
  const forwardedFor = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ipAddress: (forwardedFor || request?.headers.get("x-real-ip") || "unknown").slice(0, 64),
    userAgent: request?.headers.get("user-agent")?.slice(0, 2_000) ?? null,
  };
}

export async function authorizeCredentials(
  credentials: Partial<Record<"email" | "password", unknown>>,
  request?: Request,
): Promise<User | null> {
  const parsed = loginSchema.safeParse({
    email: credentials.email,
    password: credentials.password,
  });

  if (!parsed.success) {
    // Still perform a hash comparison for malformed input.
    await verifyPassword(String(credentials.password ?? ""), DUMMY_HASH);
    return null;
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      passwordHash: true,
      isActive: true,
      lockedUntil: true,
      failedLoginAttempts: true,
    },
  });

  if (!user?.passwordHash || !user.isActive) {
    await verifyPassword(password, DUMMY_HASH);
    return null;
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    const lockExpired = Boolean(user.lockedUntil && user.lockedUntil <= now);
    const attempts = lockExpired ? 1 : user.failedLoginAttempts + 1;
    const shouldLock = attempts >= MAX_FAILED_LOGIN_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: shouldLock ? new Date(now.getTime() + ACCOUNT_LOCK_MINUTES * 60 * 1000) : null,
      },
    });

    if (shouldLock) {
      const metadata = requestMetadata(request);
      await prisma.auditLog
        .create({
          data: {
            actorType: "SYSTEM",
            action: "auth.account_locked",
            entityType: "User",
            entityId: user.id,
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
          },
        })
        .catch(() => undefined);
    }

    return null;
  }

  const metadata = requestMetadata(request);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: now,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorType: "USER",
        actorUserId: user.id,
        action: "auth.login",
        entityType: "User",
        entityId: user.id,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    }),
  ]);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  };
}
