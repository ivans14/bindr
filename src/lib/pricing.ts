import { prisma } from "./prisma";

/** Latest Cardmarket (EUR) price per card id. Cards with no snapshot are omitted. */
export async function latestEurPrices(cardIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (cardIds.length === 0) return out;

  const snaps = await prisma.priceSnapshot.findMany({
    where: { cardId: { in: cardIds }, source: "cardmarket", currency: "EUR" },
    orderBy: { fetchedAt: "desc" },
    select: { cardId: true, price: true },
  });
  for (const s of snaps) {
    if (!out.has(s.cardId)) out.set(s.cardId, Number(s.price));
  }
  return out;
}
