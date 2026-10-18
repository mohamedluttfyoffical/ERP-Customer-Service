import Stripe from "stripe";
import { type BillingInterval } from "@prisma/client";
import { getServerEnv } from "@/lib/env";
import { type PlanCode, getPlanByCode } from "@/lib/plans";

export interface CreateCheckoutParams {
  tenantId: string;
  tenantSlug: string;
  customerEmail: string;
  customerName: string;
  planCode: PlanCode;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
}

export interface CreatePortalParams {
  tenantId: string;
  tenantSlug: string;
  stripeCustomerId: string;
  returnUrl: string;
}

export interface BillingAdapter {
  createCheckoutSession(params: CreateCheckoutParams): Promise<{ url: string; sessionId: string }>;
  createPortalSession(params: CreatePortalParams): Promise<{ url: string }>;
}

/**
 * Stripe implementation of the BillingAdapter.
 */
export class StripeBillingAdapter implements BillingAdapter {
  private stripe: Stripe | null = null;

  constructor() {
    const env = getServerEnv();
    if (env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        typescript: true,
      });
    }
  }

  async createCheckoutSession(
    params: CreateCheckoutParams,
  ): Promise<{ url: string; sessionId: string }> {
    const plan = getPlanByCode(params.planCode);
    const amount = Number(plan.prices[params.interval]);

    if (!this.stripe) {
      // In development / demo when Stripe secret is not configured,
      // return a simulated checkout callback URL.
      const simulatedSessionId = `sim_cs_${Date.now()}_${params.tenantId}`;
      const url = new URL(params.successUrl);
      url.searchParams.set("simulated_session_id", simulatedSessionId);
      url.searchParams.set("plan", params.planCode);
      url.searchParams.set("interval", params.interval);
      return {
        url: url.toString(),
        sessionId: simulatedSessionId,
      };
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: params.customerEmail,
      client_reference_id: params.tenantId,
      metadata: {
        tenantId: params.tenantId,
        tenantSlug: params.tenantSlug,
        planCode: params.planCode,
        interval: params.interval,
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Sanad ERP - ${plan.nameEn} Plan`,
              description: plan.descriptionEn,
            },
            unit_amount: Math.round(amount * 100),
            recurring: {
              interval: params.interval === "ANNUAL" ? "year" : "month",
            },
          },
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    if (!session.url) {
      throw new Error("Failed to create Stripe checkout session URL.");
    }

    return {
      url: session.url,
      sessionId: session.id,
    };
  }

  async createPortalSession(params: CreatePortalParams): Promise<{ url: string }> {
    if (!this.stripe) {
      return { url: params.returnUrl };
    }

    const env = getServerEnv();
    const session = await this.stripe.billingPortal.sessions.create({
      customer: params.stripeCustomerId,
      return_url: params.returnUrl,
      configuration: env.STRIPE_PORTAL_CONFIGURATION_ID || undefined,
    });

    return { url: session.url };
  }
}

/**
 * Paymob adapter placeholder for regional MENA payment processing.
 */
export class PaymobBillingAdapter implements BillingAdapter {
  async createCheckoutSession(
    params: CreateCheckoutParams,
  ): Promise<{ url: string; sessionId: string }> {
    // Paymob intention & iframe checkout
    const simulatedSessionId = `paymob_${Date.now()}`;
    const url = new URL(params.successUrl);
    url.searchParams.set("paymob_id", simulatedSessionId);
    return { url: url.toString(), sessionId: simulatedSessionId };
  }

  async createPortalSession(params: CreatePortalParams): Promise<{ url: string }> {
    return { url: params.returnUrl };
  }
}

/**
 * Fawry adapter placeholder for Egyptian local payment gateway.
 */
export class FawryBillingAdapter implements BillingAdapter {
  async createCheckoutSession(
    params: CreateCheckoutParams,
  ): Promise<{ url: string; sessionId: string }> {
    const simulatedSessionId = `fawry_${Date.now()}`;
    const url = new URL(params.successUrl);
    url.searchParams.set("fawry_ref", simulatedSessionId);
    return { url: url.toString(), sessionId: simulatedSessionId };
  }

  async createPortalSession(params: CreatePortalParams): Promise<{ url: string }> {
    return { url: params.returnUrl };
  }
}

let stripeAdapterInstance: StripeBillingAdapter | null = null;

export function getBillingAdapter(provider: "STRIPE" | "PAYMOB" | "FAWRY" = "STRIPE"): BillingAdapter {
  if (provider === "PAYMOB") {
    return new PaymobBillingAdapter();
  }
  if (provider === "FAWRY") {
    return new FawryBillingAdapter();
  }
  if (!stripeAdapterInstance) {
    stripeAdapterInstance = new StripeBillingAdapter();
  }
  return stripeAdapterInstance;
}
