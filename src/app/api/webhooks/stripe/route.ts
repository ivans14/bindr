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
    const orderId = session.metadata?.orderId;
    if (orderId) {
      const paymentIntent =
        typeof session.payment_intent === "string" ? session.payment_intent : null;
      await prisma.fulfillmentOrder.update({
        where: { id: orderId },
        data: { paidAt: new Date(), stripePaymentIntentId: paymentIntent },
      });
      // Advance to PAID only if not already moved along by ops.
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
  }

  return NextResponse.json({ received: true });
}
