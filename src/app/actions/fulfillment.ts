"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/session";
import { latestEurPrices } from "@/lib/pricing";
import { quote, FULFILLMENT_STATES } from "@/lib/fulfillment";

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

export async function setTracking(orderId: string, carrier: string, code: string) {
  await requireAdmin();
  await prisma.fulfillmentOrder.update({
    where: { id: orderId },
    data: { carrier: carrier || null, trackingCode: code || null, state: "SHIPPED" },
  });
  revalidatePath(`/ops/${orderId}`);
  revalidatePath("/ops");
}
