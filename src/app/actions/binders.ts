"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const SLOTS_PER_PAGE = 9;

/** Load a binder the current user owns, or throw. */
async function ownedBinder(binderId: string) {
  const user = await requireUser();
  const binder = await prisma.binder.findUnique({ where: { id: binderId } });
  if (!binder || binder.ownerId !== user.id) throw new Error("Not found");
  return binder;
}

export async function createBinder(formData: FormData) {
  const user = await requireUser();
  const title = (formData.get("title") as string)?.trim() || "Untitled binder";

  const binder = await prisma.binder.create({
    data: {
      ownerId: user.id,
      title,
      slots: {
        create: Array.from({ length: SLOTS_PER_PAGE }, (_, i) => ({ position: i })),
      },
    },
  });

  redirect(`/binders/${binder.id}`);
}

export async function addPage(binderId: string) {
  const binder = await ownedBinder(binderId);
  const start = binder.pageCount * SLOTS_PER_PAGE;
  await prisma.$transaction([
    prisma.binder.update({
      where: { id: binderId },
      data: { pageCount: { increment: 1 } },
    }),
    prisma.binderSlot.createMany({
      data: Array.from({ length: SLOTS_PER_PAGE }, (_, i) => ({
        binderId,
        position: start + i,
      })),
    }),
  ]);
  revalidatePath(`/binders/${binderId}`);
}

const placeSchema = z.object({
  binderId: z.string(),
  position: z.number().int().min(0),
  cardId: z.string(),
});

export async function placeCard(input: z.infer<typeof placeSchema>) {
  const { binderId, position, cardId } = placeSchema.parse(input);
  await ownedBinder(binderId);
  await prisma.binderSlot.upsert({
    where: { binderId_position: { binderId, position } },
    create: { binderId, position, cardId, status: "WANTED" },
    update: { cardId, status: "WANTED" },
  });
  revalidatePath(`/binders/${binderId}`);
}

export async function clearSlot(binderId: string, position: number) {
  await ownedBinder(binderId);
  await prisma.binderSlot.update({
    where: { binderId_position: { binderId, position } },
    data: { cardId: null, status: "EMPTY", note: null },
  });
  revalidatePath(`/binders/${binderId}`);
}

export async function setSlotStatus(
  binderId: string,
  position: number,
  status: "OWNED" | "WANTED",
) {
  await ownedBinder(binderId);
  await prisma.binderSlot.update({
    where: { binderId_position: { binderId, position } },
    data: { status },
  });
  revalidatePath(`/binders/${binderId}`);
}

const metaSchema = z.object({
  binderId: z.string(),
  title: z.string().min(1).max(120).optional(),
  theme: z.string().max(40).optional(),
  visibility: z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]).optional(),
});

export async function updateBinderMeta(input: z.infer<typeof metaSchema>) {
  const { binderId, ...rest } = metaSchema.parse(input);
  await ownedBinder(binderId);
  await prisma.binder.update({ where: { id: binderId }, data: rest });
  revalidatePath(`/binders/${binderId}`);
}

export async function deleteBinder(binderId: string) {
  await ownedBinder(binderId);
  await prisma.binder.delete({ where: { id: binderId } });
  revalidatePath("/binders");
  redirect("/binders");
}

/** Card search for the builder — matches name across synced sets. */
export async function searchCards(query: string) {
  const q = query.trim();
  if (q.length < 2) return [];
  const cards = await prisma.card.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    orderBy: [{ name: "asc" }, { releasedAt: "desc" }],
    take: 40,
    select: {
      id: true,
      name: true,
      number: true,
      setName: true,
      rarity: true,
      imageSmall: true,
    },
  });

  const prices = await prisma.priceSnapshot.findMany({
    where: { cardId: { in: cards.map((c) => c.id) }, source: "cardmarket", currency: "EUR" },
    orderBy: { fetchedAt: "desc" },
    select: { cardId: true, price: true },
  });
  const priceMap = new Map<string, number>();
  for (const p of prices) if (!priceMap.has(p.cardId)) priceMap.set(p.cardId, Number(p.price));

  return cards.map((c) => ({ ...c, priceEur: priceMap.get(c.id) ?? null }));
}
