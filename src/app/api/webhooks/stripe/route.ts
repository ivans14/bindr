import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { emailOrderPaid } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? "", secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  // Idempotency — skip events we've already handled.
  const seen = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
  if (seen) return NextResponse.json({ received: true });
  await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.mode === "subscription") {
      // Collector subscription started.
      const userId = session.metadata?.userId;
      const subId = typeof session.subscription === "string" ? session.subscription : null;
      const customerId = typeof session.customer === "string" ? session.customer : null;
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            tier: "PAID",
            subscriptionStatus: "active",
            stripeSubscriptionId: subId,
            ...(customerId ? { stripeCustomerId: customerId } : {}),
          },
        });
      }
    } else if (session.metadata?.orderId) {
      // Fulfillment order paid.
      const orderId = session.metadata.orderId;
      const paymentIntent =
        typeof session.payment_intent === "string" ? session.payment_intent : null;
      await prisma.fulfillmentOrder.update({
        where: { id: orderId },
        data: { paidAt: new Date(), stripePaymentIntentId: paymentIntent },
      });
      await prisma.fulfillmentOrder.updateMany({
        where: { id: orderId, state: { in: ["REQUESTED", "QUOTED"] } },
        data: { state: "PAID" },
      });
      const order = await prisma.fulfillmentOrder.findUnique({
        where: { id: orderId },
        include: { user: { select: { email: true } }, binder: { select: { title: true } } },
      });
      if (order) {
        await emailOrderPaid(order.user.email, {
          id: order.id,
          binderTitle: order.binder.title,
          total: Number(order.quotedTotal ?? 0),
        });
      }
    }
  } else if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === "string" ? sub.customer : null;
    if (customerId) {
      const active = sub.status === "active" || sub.status === "trialing";
      const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
      await prisma.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          tier: active ? "PAID" : "FREE",
          subscriptionStatus: sub.status,
          stripeSubscriptionId: sub.id,
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
