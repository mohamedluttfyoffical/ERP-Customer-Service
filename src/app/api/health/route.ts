import { NextResponse } from "next/server";

import { APP_CONFIG } from "@/lib/config";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Check = {
  status: "ok" | "degraded" | "not_configured";
  latencyMs?: number;
};

async function checkDatabase(): Promise<Check> {
  if (!process.env.DATABASE_URL) {
    return { status: "not_configured" };
  }

  const startedAt = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: "ok",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    console.error("[health] database check failed", error);
    return {
      status: "degraded",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }
}

export async function GET() {
  const database = await checkDatabase();
  const integrations = {
    stripe: process.env.STRIPE_SECRET_KEY ? "configured" : "not_configured",
    realtime:
      process.env.PUSHER_APP_ID && process.env.NEXT_PUBLIC_PUSHER_KEY
        ? "configured"
        : "not_configured",
  } as const;

  const isHealthy = database.status === "ok";

  return NextResponse.json(
    {
      status: isHealthy ? "ok" : "degraded",
      service: "sanad-erp",
      version: APP_CONFIG.version,
      phase: APP_CONFIG.phase,
      timestamp: new Date().toISOString(),
      checks: {
        application: { status: "ok" } satisfies Check,
        database,
        integrations,
      },
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
