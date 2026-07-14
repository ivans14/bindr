"use server";

import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const COLLECTOR_PRICE_CENTS = 900; // €9 / month

function appBase() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
}

type SessionUser = { id: string; email: string; tier?: string; stripeCustomerId?: string | null };

/** Start a Collector subscription via Stripe Checkout (subscription mode). */
export async function startSubscription() {
  const user = (await requireUser()) as SessionUser;
  if (!stripe) return { error: "Billing isn't configured yet." };
  if (user.tier === "PAID") return { error: "You're already a Collector." };

  let customerId = user.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: COLLECTOR_PRICE_CENTS,
          recurring: { interval: "month" },
          product_data: { name: "bindr Collector" },
        },
      },
    ],
    success_url: `${appBase()}/account?upgraded=1`,
    cancel_url: `${appBase()}/account`,
    metadata: { userId: user.id },
  });
  return { ok: true as const, url: session.url };
}

/** Open the Stripe billing portal to manage/cancel the subscription. */
export async function openBillingPortal() {
  const user = (await requireUser()) as SessionUser;
  if (!stripe) return { error: "Billing isn't configured yet." };
  if (!user.stripeCustomerId) return { error: "No billing account yet." };

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appBase()}/account`,
  });
  return { ok: true as const, url: session.url };
}
