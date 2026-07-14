"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { CardFilters } from "@/lib/card-query";
import { hasActiveFilters } from "@/lib/card-query";

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

/** Move/swap a card between two pockets, preserving each card's owned/wanted status. */
export async function moveSlot(binderId: string, from: number, to: number) {
  await ownedBinder(binderId);
  if (from === to) return;

  const a = await prisma.binderSlot.findUnique({
    where: { binderId_position: { binderId, position: from } },
  });
  const b = await prisma.binderSlot.findUnique({
    where: { binderId_position: { binderId, position: to } },
  });

  await prisma.$transaction([
    prisma.binderSlot.update({
      where: { binderId_position: { binderId, position: from } },
      data: { cardId: b?.cardId ?? null, status: b?.status ?? "EMPTY", note: b?.note ?? null },
    }),
    prisma.binderSlot.update({
      where: { binderId_position: { binderId, position: to } },
      data: { cardId: a?.cardId ?? null, status: a?.status ?? "EMPTY", note: a?.note ?? null },
    }),
  ]);
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

/** Card search for the builder — text query and/or structured filters. */
export async function searchCards(filters: CardFilters) {
  if (!hasActiveFilters(filters)) return [];

  const where: Prisma.CardWhereInput = { language: filters.language || "en" };
  const q = filters.query?.trim();
  if (q && q.length >= 2) where.name = { contains: q, mode: "insensitive" };
  if (filters.supertype) where.supertype = filters.supertype;
  if (filters.setId) where.setId = filters.setId;
  if (filters.artist?.trim()) where.artist = { contains: filters.artist.trim(), mode: "insensitive" };
  if (filters.fullArt) where.isFullArt = true;
  if (filters.types?.length) where.types = { hasSome: filters.types };
  if (filters.subtypes?.length) where.subtypes = { hasSome: filters.subtypes };

  const cards = await prisma.card.findMany({
    where,
    orderBy: [{ name: "asc" }, { releasedAt: "desc" }],
    take: 60,
    select: { id: true, name: true, number: true, setName: true, imageBase: true },
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

/** Filter facets that are data-dependent (sets, per language). */
export async function getCardFacets() {
  const sets = await prisma.card.groupBy({
    by: ["setId", "setName", "language"],
    orderBy: { setName: "asc" },
  });
  return { sets: sets.map((s) => ({ id: s.setId, name: s.setName, language: s.language })) };
}

/**
 * Bulk-import cards into a binder from CSV text: `name,set,number,status` per line
 * (status = owned|wanted, default wanted). Resolves each row to a card, fills empty
 * slots in order, and adds pages as needed. Returns a summary incl. unmatched rows.
 */
export async function importCards(binderId: string, text: string) {
  const binder = await ownedBinder(binderId);

  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 500);
  if (lines[0] && /name/i.test(lines[0]) && /(number|set)/i.test(lines[0])) lines.shift();

  const rows = lines
    .map((line) => {
      const [name = "", set = "", number = "", status = ""] = line.split(",").map((s) => s.trim());
      return {
        raw: line,
        name,
        set,
        number,
        status: /^(o|owned)$/i.test(status) ? ("OWNED" as const) : ("WANTED" as const),
      };
    })
    .filter((r) => r.name || r.number);

  const IDENTITY = {
    id: true,
    name: true,
    number: true,
    setName: true,
    imageBase: true,
  } as const;

  // CSV import resolves against English cards for determinism.
  const LANG = { language: "en" } as const;

  async function resolve(row: (typeof rows)[number]) {
    const { name, set, number } = row;
    if (number && set) {
      const cs = await prisma.card.findMany({
        where: {
          ...LANG,
          number,
          OR: [{ setId: set }, { setName: { contains: set, mode: "insensitive" } }],
        },
        take: 10,
        select: IDENTITY,
      });
      if (cs.length === 1) return cs[0];
      if (cs.length > 1 && name) {
        const m = cs.find((c) => c.name.toLowerCase().includes(name.toLowerCase()));
        return m ?? cs[0];
      }
      if (cs.length) return cs[0];
    }
    if (name && number) {
      const cs = await prisma.card.findMany({
        where: { ...LANG, number, name: { contains: name, mode: "insensitive" } },
        take: 1,
        select: IDENTITY,
      });
      if (cs.length) return cs[0];
    }
    if (name) {
      const cs = await prisma.card.findMany({
        where: { ...LANG, name: { contains: name, mode: "insensitive" } },
        orderBy: { releasedAt: "desc" },
        take: 1,
        select: IDENTITY,
      });
      if (cs.length) return cs[0];
    }
    return null;
  }

  type Resolved = { card: Prisma.CardGetPayload<{ select: typeof IDENTITY }>; status: "OWNED" | "WANTED" };
  const resolved: Resolved[] = [];
  const unmatched: string[] = [];
  for (const row of rows) {
    const card = await resolve(row);
    if (card) resolved.push({ card, status: row.status });
    else unmatched.push(row.raw);
  }

  const slots = await prisma.binderSlot.findMany({
    where: { binderId },
    orderBy: { position: "asc" },
  });
  const emptyPositions = slots.filter((s) => !s.cardId).map((s) => s.position);
  let nextNewPos = slots.length ? Math.max(...slots.map((s) => s.position)) + 1 : 0;

  // Add pages until there is room for every resolved card.
  let pagesAdded = 0;
  const newSlots: { binderId: string; position: number }[] = [];
  while (emptyPositions.length + newSlots.length < resolved.length) {
    for (let i = 0; i < SLOTS_PER_PAGE; i++) {
      newSlots.push({ binderId, position: nextNewPos });
      emptyPositions.push(nextNewPos);
      nextNewPos++;
    }
    pagesAdded++;
  }
  if (newSlots.length) {
    await prisma.binderSlot.createMany({ data: newSlots });
    await prisma.binder.update({
      where: { id: binderId },
      data: { pageCount: { increment: pagesAdded } },
    });
  }

  emptyPositions.sort((a, b) => a - b);
  await prisma.$transaction(
    resolved.map((r, i) =>
      prisma.binderSlot.update({
        where: { binderId_position: { binderId, position: emptyPositions[i] } },
        data: { cardId: r.card.id, status: r.status },
      }),
    ),
  );

  const priceRows = await prisma.priceSnapshot.findMany({
    where: { cardId: { in: resolved.map((r) => r.card.id) }, source: "cardmarket", currency: "EUR" },
    orderBy: { fetchedAt: "desc" },
    select: { cardId: true, price: true },
  });
  const priceMap = new Map<string, number>();
  for (const p of priceRows) if (!priceMap.has(p.cardId)) priceMap.set(p.cardId, Number(p.price));

  const placements = resolved.map((r, i) => ({
    position: emptyPositions[i],
    status: r.status,
    card: r.card,
    priceEur: priceMap.get(r.card.id) ?? null,
  }));

  revalidatePath(`/binders/${binderId}`);
  return {
    placed: resolved.length,
    unmatched,
    pagesAdded,
    pageCount: binder.pageCount + pagesAdded,
    placements,
  };
}
