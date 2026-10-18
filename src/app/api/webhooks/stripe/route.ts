import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerEnv } from "@/lib/env";
import { processStripeWebhookEvent, type StripeEventPayload } from "@/lib/billing/webhook-processor";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const env = getServerEnv();
    const bodyText = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    let event: StripeEventPayload | Stripe.Event;

    if (env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && signature) {
      const stripe = new Stripe(env.STRIPE_SECRET_KEY, { typescript: true });
      event = stripe.webhooks.constructEvent(bodyText, signature, env.STRIPE_WEBHOOK_SECRET);
    } else {
      // In development or test environments where secret is not configured
      try {
        event = JSON.parse(bodyText) as StripeEventPayload;
      } catch {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
      }
    }

    if (!event || !event.id || !event.type) {
      return NextResponse.json({ error: "Invalid event object" }, { status: 400 });
    }

    const result = await processStripeWebhookEvent(event as StripeEventPayload);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[Stripe Webhook Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook handler failed" },
      { status: 400 },
    );
  }
}
