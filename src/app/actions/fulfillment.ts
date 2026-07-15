"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireUser, requireAdmin, isPaid } from "@/lib/session";
import { latestEurPrices } from "@/lib/pricing";
import { quote, FULFILLMENT_STATES } from "@/lib/fulfillment";
import { emailOrderRequested, emailOrderShipped } from "@/lib/email";

function appBase() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
}

/** Create a Stripe Checkout session to pay for a fulfillment order. */
export async function createCheckout(orderId: string) {
  const user = await requireUser();
  const order = await prisma.fulfillmentOrder.findUnique({
    where: { id: orderId },
    include: { binder: { select: { title: true } } },
  });
  if (!order || order.userId !== user.id) return { error: "Order not found." };
  if (!stripe) return { error: "Payment isn't configured yet." };
  if (order.paidAt) return { error: "This order is already paid." };

  const amount = Math.round(Number(order.quotedTotal ?? 0) * 100);
  if (amount <= 0) return { error: "Nothing to charge." };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: amount,
          product_data: { name: `bindr build — ${order.binder.title}` },
        },
      },
    ],
    success_url: `${appBase()}/orders/${orderId}?paid=1`,
    cancel_url: `${appBase()}/orders/${orderId}`,
    metadata: { orderId },
  });

  await prisma.fulfillmentOrder.update({
    where: { id: orderId },
    data: { stripeSessionId: session.id },
  });
  return { ok: true as const, url: session.url };
}

const addressSchema = z.object({
  binderId: z.string(),
  shipName: z.string().min(1).max(120),
  shipLine1: z.string().min(1).max(160),
  shipLine2: z.string().max(160).optional(),
  shipCity: z.string().min(1).max(80),
  shipPostal: z.string().min(1).max(20),
  shipCountry: z.string().min(1).max(60),
});

/** Create a fulfillment request from a binder's "to source" (WANTED) cards. */
export async function requestFulfillment(input: z.infer<typeof addressSchema>) {
  const data = addressSchema.parse(input);
  const user = await requireUser();
  if (!isPaid(user)) return { error: "Physical builds are a Collector feature — upgrade to unlock." };

  const binder = await prisma.binder.findUnique({
    where: { id: data.binderId },
    include: {
      slots: {
        where: { status: "WANTED", cardId: { not: null } },
        include: {
          card: { select: { id: true, name: true, setName: true, number: true, imageBase: true } },
        },
      },
    },
  });
  if (!binder || binder.ownerId !== user.id) return { error: "Binder not found." };

  const wanted = binder.slots.filter((s) => s.card);
  if (wanted.length === 0) return { error: "This binder has no cards marked to source." };

  const prices = await latestEurPrices(wanted.map((s) => s.cardId!));
  const cardsTotal = wanted.reduce((sum, s) => sum + (prices.get(s.cardId!) ?? 0), 0);
  const q = quote(cardsTotal);

  const order = await prisma.fulfillmentOrder.create({
    data: {
      binderId: binder.id,
      userId: user.id,
      state: "REQUESTED",
      cardsTotal: q.cardsTotal,
      serviceFee: q.serviceFee,
      shippingFee: q.shippingFee,
      quotedTotal: q.total,
      shipName: data.shipName,
      shipLine1: data.shipLine1,
      shipLine2: data.shipLine2 || null,
      shipCity: data.shipCity,
      shipPostal: data.shipPostal,
      shipCountry: data.shipCountry,
      items: {
        create: wanted.map((s) => ({
          cardId: s.cardId,
          name: s.card!.name,
          setName: s.card!.setName,
          number: s.card!.number,
          imageBase: s.card!.imageBase,
          priceEur: prices.get(s.cardId!) ?? null,
        })),
      },
    },
  });

  await emailOrderRequested(user.email, {
    id: order.id,
    binderTitle: binder.title,
    itemCount: wanted.length,
    total: q.total,
  });

  return { ok: true as const, orderId: order.id };
}

// ---------- Ops (admin) ----------

const stateSchema = z.enum(FULFILLMENT_STATES);

export async function advanceFulfillment(orderId: string, state: string) {
  await requireAdmin();
  const next = stateSchema.parse(state);
  await prisma.fulfillmentOrder.update({ where: { id: orderId }, data: { state: next } });
  revalidatePath(`/ops/${orderId}`);
  revalidatePath("/ops");
}

export async function setItemSourced(orderId: string, itemId: string, sourced: boolean) {
  await requireAdmin();
  await prisma.fulfillmentItem.update({ where: { id: itemId }, data: { sourced } });
  revalidatePath(`/ops/${orderId}`);
}

/** Record the actual price paid to source a card (for slippage/margin tracking). */
export async function setSourcedPrice(orderId: string, itemId: string, price: number | null) {
  await requireAdmin();
  const clean = price != null && Number.isFinite(price) && price >= 0 ? price : null;
  await prisma.fulfillmentItem.update({
    where: { id: itemId },
    data: { sourcedPrice: clean, ...(clean != null ? { sourced: true } : {}) },
  });
  revalidatePath(`/ops/${orderId}`);
}

export async function setTracking(orderId: string, carrier: string, code: string) {
  await requireAdmin();
  const order = await prisma.fulfillmentOrder.update({
    where: { id: orderId },
    data: { carrier: carrier || null, trackingCode: code || null, state: "SHIPPED" },
    include: { user: { select: { email: true } }, binder: { select: { title: true } } },
  });
  await emailOrderShipped(order.user.email, {
    id: order.id,
    binderTitle: order.binder.title,
    carrier: carrier || null,
    tracking: code || null,
  });
  revalidatePath(`/ops/${orderId}`);
  revalidatePath("/ops");
}
