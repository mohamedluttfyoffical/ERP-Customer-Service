import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { type BillingInterval, type SubscriptionStatus, type TenantStatus } from "@prisma/client";

export interface StripeEventPayload {
  id: string;
  type: string;
  data: {
    object: {
      id?: string;
      status?: string;
      customer?: string | null;
      subscription?: string | null;
      client_reference_id?: string | null;
      metadata?: Record<string, string | undefined>;
      current_period_start?: number;
      current_period_end?: number;
      cancel_at_period_end?: boolean;
      amount_paid?: number;
      number?: string;
      hosted_invoice_url?: string | null;
      invoice_pdf?: string | null;
      period_start?: number;
      period_end?: number;
      [key: string]: unknown;
    };
  };
}

export function mapStripeStatusToSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "unpaid":
      return "UNPAID";
    case "paused":
      return "PAUSED";
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "INCOMPLETE_EXPIRED";
    default:
      return "ACTIVE";
  }
}

export async function processStripeWebhookEvent(event: StripeEventPayload): Promise<{
  success: boolean;
  message?: string;
  duplicate?: boolean;
}> {
  const eventId = event.id;
  const eventType = event.type;
  const provider = "STRIPE";

  // 1. Idempotency Check using WebhookEvent
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: {
      provider_eventId: {
        provider,
        eventId,
      },
    },
  });

  if (existingEvent && existingEvent.status === "PROCESSED") {
    return { success: true, duplicate: true, message: "Event already processed." };
  }

  // Create or mark as processing
  const webhookRecord = existingEvent
    ? await prisma.webhookEvent.update({
        where: { id: existingEvent.id },
        data: {
          status: "PROCESSING",
          attempts: { increment: 1 },
        },
      })
    : await prisma.webhookEvent.create({
        data: {
          provider,
          eventId,
          eventType,
          status: "PROCESSING",
          payload: event as unknown as Prisma.InputJsonValue,
          attempts: 1,
        },
      });

  try {
    const obj = event.data.object;

    switch (eventType) {
      case "checkout.session.completed": {
        const tenantId = (obj.client_reference_id || obj.metadata?.tenantId) as string | undefined;
        const planCode = (obj.metadata?.planCode || "STARTER") as string;
        const interval = (obj.metadata?.interval || "MONTHLY") as BillingInterval;
        const stripeCustomerId = (obj.customer as string) || null;
        const stripeSubscriptionId = (obj.subscription as string) || null;

        if (!tenantId) {
          throw new Error("Missing tenantId in checkout session metadata.");
        }

        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
          throw new Error(`Tenant not found: ${tenantId}`);
        }

        const plan = await prisma.plan.findUnique({
          where: { code: planCode },
          include: { prices: true },
        });
        if (!plan) {
          throw new Error(`Plan not found: ${planCode}`);
        }

        const planPrice = plan.prices.find((p) => p.interval === interval);
        const unitAmount = planPrice?.amount ?? new Prisma.Decimal(29);

        // Update or create active subscription
        const existingSub = await prisma.subscription.findFirst({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
        });

        const now = new Date();
        const periodEnd = new Date(now);
        if (interval === "ANNUAL") {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        let subscriptionId: string;

        if (existingSub) {
          const updated = await prisma.subscription.update({
            where: { id: existingSub.id },
            data: {
              planId: plan.id,
              planPriceId: planPrice?.id,
              interval,
              status: "ACTIVE",
              provider: "STRIPE",
              providerCustomerId: stripeCustomerId,
              providerSubscriptionId: stripeSubscriptionId,
              unitAmount,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              startedAt: now,
              trialEnd: null,
            },
          });
          subscriptionId = updated.id;
        } else {
          const created = await prisma.subscription.create({
            data: {
              tenantId,
              planId: plan.id,
              planPriceId: planPrice?.id,
              interval,
              status: "ACTIVE",
              provider: "STRIPE",
              providerCustomerId: stripeCustomerId,
              providerSubscriptionId: stripeSubscriptionId,
              unitAmount,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              startedAt: now,
            },
          });
          subscriptionId = created.id;
        }

        // Update tenant
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            status: "ACTIVE",
            stripeCustomerId: stripeCustomerId ?? undefined,
            activatedAt: now,
            suspendedAt: null,
          },
        });

        // Record initial invoice
        const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
        await prisma.subscriptionInvoice.create({
          data: {
            tenantId,
            subscriptionId,
            number: invoiceNumber,
            status: "PAID",
            currency: "USD",
            subtotal: unitAmount,
            total: unitAmount,
            amountPaid: unitAmount,
            amountDue: new Prisma.Decimal(0),
            periodStart: now,
            periodEnd,
            issuedAt: now,
            paidAt: now,
            lines: {
              create: {
                tenantId,
                description: `${plan.nameEn} Plan (${interval})`,
                quantity: 1,
                unitAmount,
                amount: unitAmount,
              },
            },
          },
        });

        // Audit Log
        await prisma.auditLog.create({
          data: {
            tenantId,
            actorType: "SYSTEM",
            action: "subscription.checkout_completed",
            entityType: "Subscription",
            entityId: subscriptionId,
            after: {
              planCode,
              interval,
              amount: unitAmount.toString(),
              stripeCustomerId,
              stripeSubscriptionId,
            },
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        const stripeSubscriptionId = obj.id as string;
        const stripeStatus = obj.status as string;
        const currentPeriodStart = obj.current_period_start
          ? new Date(obj.current_period_start * 1000)
          : undefined;
        const currentPeriodEnd = obj.current_period_end
          ? new Date(obj.current_period_end * 1000)
          : undefined;
        const cancelAtPeriodEnd = Boolean(obj.cancel_at_period_end);

        const sub = await prisma.subscription.findFirst({
          where: { providerSubscriptionId: stripeSubscriptionId },
        });

        if (sub) {
          const newStatus = mapStripeStatusToSubscriptionStatus(stripeStatus);
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: newStatus,
              currentPeriodStart,
              currentPeriodEnd,
              cancelAtPeriodEnd,
            },
          });

          // Sync tenant status
          let tenantStatusUpdate: TenantStatus | undefined;
          if (newStatus === "PAST_DUE") {
            tenantStatusUpdate = "PAST_DUE";
          } else if (newStatus === "ACTIVE") {
            tenantStatusUpdate = "ACTIVE";
          } else if (newStatus === "CANCELED") {
            tenantStatusUpdate = "CANCELED";
          }

          if (tenantStatusUpdate) {
            await prisma.tenant.update({
              where: { id: sub.tenantId },
              data: { status: tenantStatusUpdate },
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSubscriptionId = obj.id as string;
        const sub = await prisma.subscription.findFirst({
          where: { providerSubscriptionId: stripeSubscriptionId },
        });

        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: "CANCELED",
              endedAt: new Date(),
            },
          });

          await prisma.tenant.update({
            where: { id: sub.tenantId },
            data: {
              status: "CANCELED",
              canceledAt: new Date(),
            },
          });

          await prisma.auditLog.create({
            data: {
              tenantId: sub.tenantId,
              actorType: "SYSTEM",
              action: "subscription.canceled",
              entityType: "Subscription",
              entityId: sub.id,
              after: { stripeSubscriptionId },
            },
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const stripeInvoiceId = obj.id as string;
        const stripeSubId = obj.subscription as string | undefined;
        const amountPaid = new Prisma.Decimal((obj.amount_paid || 0) / 100);

        if (stripeSubId) {
          const sub = await prisma.subscription.findFirst({
            where: { providerSubscriptionId: stripeSubId },
          });

          if (sub) {
            // Re-activate if past due
            if (sub.status === "PAST_DUE") {
              await prisma.subscription.update({
                where: { id: sub.id },
                data: { status: "ACTIVE" },
              });
              await prisma.tenant.update({
                where: { id: sub.tenantId },
                data: { status: "ACTIVE" },
              });
            }

            // Create or update subscription invoice
            const invoiceNumber = obj.number || `INV-${Date.now().toString().slice(-8)}`;
            await prisma.subscriptionInvoice.upsert({
              where: {
                providerInvoiceId: stripeInvoiceId,
              },
              create: {
                tenantId: sub.tenantId,
                subscriptionId: sub.id,
                number: invoiceNumber,
                status: "PAID",
                providerInvoiceId: stripeInvoiceId,
                hostedInvoiceUrl: obj.hosted_invoice_url || null,
                pdfUrl: obj.invoice_pdf || null,
                subtotal: amountPaid,
                total: amountPaid,
                amountPaid,
                amountDue: new Prisma.Decimal(0),
                periodStart: new Date((obj.period_start || Date.now() / 1000) * 1000),
                periodEnd: new Date((obj.period_end || Date.now() / 1000) * 1000),
                paidAt: new Date(),
              },
              update: {
                status: "PAID",
                amountPaid,
                amountDue: new Prisma.Decimal(0),
                paidAt: new Date(),
                hostedInvoiceUrl: obj.hosted_invoice_url || undefined,
                pdfUrl: obj.invoice_pdf || undefined,
              },
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const stripeSubId = obj.subscription as string | undefined;
        if (stripeSubId) {
          const sub = await prisma.subscription.findFirst({
            where: { providerSubscriptionId: stripeSubId },
          });
          if (sub) {
            await prisma.subscription.update({
              where: { id: sub.id },
              data: { status: "PAST_DUE" },
            });
            await prisma.tenant.update({
              where: { id: sub.tenantId },
              data: { status: "PAST_DUE" },
            });
          }
        }
        break;
      }

      default:
        // Other events can be safely skipped
        break;
    }

    // Mark as PROCESSED
    await prisma.webhookEvent.update({
      where: { id: webhookRecord.id },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
        lastError: null,
      },
    });

    return { success: true };
  } catch (error: unknown) {
    await prisma.webhookEvent.update({
      where: { id: webhookRecord.id },
      data: {
        status: "FAILED",
        lastError: error instanceof Error ? error.message : String(error),
      },
    });

    throw error;
  }
}
