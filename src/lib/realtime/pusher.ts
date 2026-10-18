import Pusher from "pusher";
import { getServerEnv } from "@/lib/env";

let pusherServerInstance: Pusher | null = null;

/**
 * Returns a singleton server-side Pusher instance if environment credentials are provided.
 * Gracefully falls back to null in development/test if not configured.
 */
export function getPusherServer(): Pusher | null {
  if (pusherServerInstance) {
    return pusherServerInstance;
  }

  const env = getServerEnv();

  if (
    !env.PUSHER_APP_ID ||
    !env.PUSHER_SECRET ||
    !process.env.NEXT_PUBLIC_PUSHER_KEY ||
    !process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  ) {
    return null;
  }

  pusherServerInstance = new Pusher({
    appId: env.PUSHER_APP_ID,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY,
    secret: env.PUSHER_SECRET,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    useTLS: true,
  });

  return pusherServerInstance;
}

/**
 * Safely broadcasts a tenant-scoped event across a specific channel.
 * Will not throw if Pusher is not configured; instead logs a diagnostic warning.
 */
export async function broadcastTenantEvent(params: {
  tenantId: string;
  channel: string;
  event: string;
  data: unknown;
}): Promise<boolean> {
  const pusher = getPusherServer();
  const scopedChannel = `tenant-${params.tenantId}-${params.channel}`;

  if (!pusher) {
    // In local dev/testing without Pusher credentials, safe no-op
    return true;
  }

  try {
    await pusher.trigger(scopedChannel, params.event, params.data);
    return true;
  } catch (err: unknown) {
    console.warn(`[pusher] Failed to broadcast event '${params.event}' on '${scopedChannel}':`, err);
    return false;
  }
}
