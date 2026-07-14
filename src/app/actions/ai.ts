"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { latestEurPrices } from "@/lib/pricing";

const SLOTS_PER_PAGE = 9;
const MAX_STEPS = 8; // bound the agent loop (token cost)
const MODEL = "claude-sonnet-5";

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_cards",
    description:
      "Search the Pokémon card catalog. Combine any filters. Returns matching cards with id, name, set, number, rarity and EUR price.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name contains (min 2 chars)" },
        types: { type: "array", items: { type: "string" }, description: "Energy types, e.g. Fire, Water" },
        subtypes: { type: "array", items: { type: "string" }, description: "e.g. Basic, Stage 2, ex, VMAX, Supporter, Stadium" },
        supertype: { type: "string", enum: ["Pokémon", "Trainer", "Energy"] },
        artist: { type: "string" },
        setId: { type: "string" },
        fullArt: { type: "boolean", description: "Only illustration/alt/secret-art cards" },
        language: { type: "string", description: "en | es | ja (default en)" },
        limit: { type: "number", description: "Max results (default 20, max 40)" },
      },
    },
  },
  {
    name: "get_price",
    description: "Get the latest Cardmarket EUR price for a card id.",
    input_schema: {
      type: "object",
      properties: { cardId: { type: "string" } },
      required: ["cardId"],
    },
  },
  {
    name: "submit_proposal",
    description: "Finalize the binder with the chosen cards, in display order. Call exactly once when done.",
    input_schema: {
      type: "object",
      properties: {
        cardIds: { type: "array", items: { type: "string" } },
        note: { type: "string", description: "One short sentence describing the assembled binder." },
      },
      required: ["cardIds"],
    },
  },
];

type SearchInput = {
  query?: string;
  types?: string[];
  subtypes?: string[];
  supertype?: string;
  artist?: string;
  setId?: string;
  fullArt?: boolean;
  language?: string;
  limit?: number;
};

async function searchTool(input: SearchInput) {
  const where: Prisma.CardWhereInput = { language: input.language || "en" };
  if (input.query && input.query.trim().length >= 2) {
    const q = input.query.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { nameEn: { contains: q, mode: "insensitive" } },
    ];
  }
  if (input.supertype) where.supertype = input.supertype;
  if (input.setId) where.setId = input.setId;
  if (input.artist?.trim()) where.artist = { contains: input.artist.trim(), mode: "insensitive" };
  if (input.fullArt) where.isFullArt = true;
  if (input.types?.length) where.types = { hasSome: input.types };
  if (input.subtypes?.length) where.subtypes = { hasSome: input.subtypes };

  const cards = await prisma.card.findMany({
    where,
    take: Math.min(Math.max(input.limit ?? 20, 1), 40),
    orderBy: [{ name: "asc" }],
    select: { id: true, name: true, setName: true, number: true, rarity: true, types: true },
  });
  const prices = await latestEurPrices(cards.map((c) => c.id));
  return cards.map((c) => ({
    id: c.id,
    name: c.name,
    set: c.setName,
    number: c.number,
    rarity: c.rarity,
    types: c.types,
    priceEur: prices.get(c.id) ?? null,
  }));
}

async function priceTool(cardId: string) {
  const prices = await latestEurPrices([cardId]);
  return { cardId, priceEur: prices.get(cardId) ?? null };
}

/** Run the bounded agent loop; returns the chosen card ids + note (or throws). */
async function runAgent(apiKey: string, prompt: string, capacity: number, emptyCount: number) {
  const client = new Anthropic({ apiKey });
  const system =
    `You assemble Pokémon card binders from a natural-language description. A binder page is 9 pockets; ` +
    `this binder has ${emptyCount} empty pockets. Propose up to ${capacity} cards (more pages are added if needed). ` +
    `Use search_cards to find candidates and get_price when you need a price. Respect any budget or theme (types, ` +
    `era/set, artist, full-art) the user mentions. Prefer coherent, varied selections. When finished, call ` +
    `submit_proposal with the chosen card ids in display order — never invent ids, only use ids returned by search_cards.`;

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system,
      tools: TOOLS,
      messages,
    });
    messages.push({ role: "assistant", content: res.content });

    const toolUses = res.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (toolUses.length === 0) break; // model stopped without proposing

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      if (tu.name === "submit_proposal") {
        const input = tu.input as { cardIds?: string[]; note?: string };
        return { cardIds: input.cardIds ?? [], note: input.note ?? "" };
      }
      let out: unknown;
      if (tu.name === "search_cards") out = await searchTool(tu.input as SearchInput);
      else if (tu.name === "get_price") out = await priceTool((tu.input as { cardId: string }).cardId);
      else out = { error: "unknown tool" };
      results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(out) });
    }
    messages.push({ role: "user", content: results });
  }
  return { cardIds: [], note: "" };
}

/** Assemble a binder from a description; places the proposal as an editable draft. */
export async function assembleBinder(binderId: string, prompt: string) {
  const user = await requireUser();
  const binder = await prisma.binder.findUnique({
    where: { id: binderId },
    include: { slots: true },
  });
  if (!binder || binder.ownerId !== user.id) return { error: "Binder not found." };
  if (!prompt.trim()) return { error: "Describe the binder you want." };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "AI assembly isn't configured yet (missing Anthropic key)." };

  const emptyPositions = binder.slots
    .filter((s) => !s.cardId && !s.sleeve && !s.customImage)
    .map((s) => s.position)
    .sort((a, b) => a - b);
  const capacity = Math.min(18, Math.max(emptyPositions.length, SLOTS_PER_PAGE));

  let proposal: { cardIds: string[]; note: string };
  try {
    proposal = await runAgent(apiKey, prompt.trim(), capacity, emptyPositions.length);
  } catch (err) {
    console.error("AI assemble failed:", err);
    return { error: "The AI assembler hit an error. Try again." };
  }

  // Validate proposed ids against the catalog, dedupe, and cap.
  const uniqueIds = [...new Set(proposal.cardIds)].slice(0, capacity);
  const cards = await prisma.card.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, name: true, number: true, setName: true, imageBase: true },
  });
  const byId = new Map(cards.map((c) => [c.id, c]));
  const ordered = uniqueIds.map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (ordered.length === 0) return { error: "The AI couldn't find matching cards. Try rephrasing." };

  // Place into empty pockets, adding pages as needed (mirrors CSV import).
  const positions = [...emptyPositions];
  let nextNewPos = binder.slots.length ? Math.max(...binder.slots.map((s) => s.position)) + 1 : 0;
  let pagesAdded = 0;
  const newSlots: { binderId: string; position: number }[] = [];
  while (positions.length + newSlots.length < ordered.length) {
    for (let i = 0; i < SLOTS_PER_PAGE; i++) {
      newSlots.push({ binderId, position: nextNewPos });
      positions.push(nextNewPos);
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
  positions.sort((a, b) => a - b);

  await prisma.$transaction(
    ordered.map((c, i) =>
      prisma.binderSlot.update({
        where: { binderId_position: { binderId, position: positions[i] } },
        data: { cardId: c.id, status: "WANTED", sleeve: null, customImage: null },
      }),
    ),
  );

  const prices = await latestEurPrices(ordered.map((c) => c.id));
  const placements = ordered.map((c, i) => ({
    position: positions[i],
    status: "WANTED" as const,
    card: c,
    priceEur: prices.get(c.id) ?? null,
  }));

  revalidatePath(`/binders/${binderId}`);
  return {
    ok: true as const,
    note: proposal.note,
    placed: ordered.length,
    pagesAdded,
    pageCount: binder.pageCount + pagesAdded,
    placements,
  };
}
