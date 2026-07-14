/**
 * Sync Pokémon cards from pokemontcg.io into the local Card / PriceSnapshot tables.
 *
 *   pnpm sync:cards                 # curated default set list
 *   pnpm sync:cards sv3pt5 base1    # specific set ids
 *   pnpm sync:cards --all           # every set (slow: ~20k cards)
 *
 * An optional POKEMONTCG_API_KEY in .env raises the rate limit.
 */
import { prisma } from "../src/lib/prisma";

const API = "https://api.pokemontcg.io/v2";
const API_KEY = process.env.POKEMONTCG_API_KEY || "";

// Recognisable modern + vintage sets that make for good demo search results.
const DEFAULT_SETS = ["sv3pt5", "sv1", "swsh1", "base1", "sm12"];

type ApiCard = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  supertype?: string;
  subtypes?: string[];
  types?: string[];
  artist?: string;
  images?: { small?: string; large?: string };
  set?: { id: string; name: string; series?: string; releaseDate?: string };
  cardmarket?: { url?: string; prices?: Record<string, number | null> };
  tcgplayer?: {
    url?: string;
    prices?: Record<string, { market?: number | null } | undefined>;
  };
};

// Heuristic: pokemontcg.io has no "full art" flag, so infer it from rarity/subtypes.
const FULL_ART_RARITY =
  /illustration|full art|special|ultra|rainbow|secret|hyper|gold|amazing|radiant|gallery|shiny|character/i;
function computeFullArt(card: ApiCard): boolean {
  if (card.rarity && FULL_ART_RARITY.test(card.rarity)) return true;
  return (card.subtypes ?? []).some((s) => /vmax|vstar/i.test(s));
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: API_KEY ? { "X-Api-Key": API_KEY } : {},
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function listAllSetIds(): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;
  for (;;) {
    const { data, totalCount } = await fetchJson(
      `${API}/sets?page=${page}&pageSize=250&orderBy=releaseDate`,
    );
    ids.push(...data.map((s: { id: string }) => s.id));
    if (ids.length >= totalCount || data.length === 0) break;
    page++;
  }
  return ids;
}

function cardmarketEur(card: ApiCard): number | null {
  const p = card.cardmarket?.prices;
  if (!p) return null;
  return p.trendPrice ?? p.averageSellPrice ?? p.avg7 ?? null;
}

function tcgplayerUsd(card: ApiCard): number | null {
  const p = card.tcgplayer?.prices;
  if (!p) return null;
  for (const variant of ["holofoil", "normal", "reverseHolofoil", "1stEditionHolofoil"]) {
    const m = p[variant]?.market;
    if (typeof m === "number") return m;
  }
  return null;
}

async function syncSet(setId: string) {
  let page = 1;
  let cardsInSet = 0;
  for (;;) {
    const { data } = (await fetchJson(
      `${API}/cards?q=set.id:${setId}&page=${page}&pageSize=250&orderBy=number`,
    )) as { data: ApiCard[] };
    if (!data || data.length === 0) break;

    for (const c of data) {
      const releasedAt = c.set?.releaseDate ? new Date(c.set.releaseDate) : null;
      await prisma.card.upsert({
        where: { id: c.id },
        create: {
          id: c.id,
          name: c.name,
          number: c.number,
          setId: c.set?.id ?? setId,
          setName: c.set?.name ?? "",
          setSeries: c.set?.series ?? null,
          rarity: c.rarity ?? null,
          supertype: c.supertype ?? null,
          subtypes: c.subtypes ?? [],
          types: c.types ?? [],
          artist: c.artist ?? null,
          isFullArt: computeFullArt(c),
          imageSmall: c.images?.small ?? null,
          imageLarge: c.images?.large ?? null,
          cardmarketUrl: c.cardmarket?.url ?? null,
          tcgplayerUrl: c.tcgplayer?.url ?? null,
          releasedAt,
        },
        update: {
          name: c.name,
          rarity: c.rarity ?? null,
          supertype: c.supertype ?? null,
          subtypes: c.subtypes ?? [],
          types: c.types ?? [],
          artist: c.artist ?? null,
          isFullArt: computeFullArt(c),
          imageSmall: c.images?.small ?? null,
          imageLarge: c.images?.large ?? null,
          cardmarketUrl: c.cardmarket?.url ?? null,
          tcgplayerUrl: c.tcgplayer?.url ?? null,
        },
      });

      const eur = cardmarketEur(c);
      if (eur != null) {
        await prisma.priceSnapshot.create({
          data: { cardId: c.id, source: "cardmarket", price: eur, currency: "EUR" },
        });
      }
      const usd = tcgplayerUsd(c);
      if (usd != null) {
        await prisma.priceSnapshot.create({
          data: { cardId: c.id, source: "tcgplayer", price: usd, currency: "USD" },
        });
      }
    }

    cardsInSet += data.length;
    if (data.length < 250) break;
    page++;
  }
  return cardsInSet;
}

async function main() {
  const args = process.argv.slice(2);
  const sets = args.includes("--all")
    ? await listAllSetIds()
    : args.length > 0
      ? args
      : DEFAULT_SETS;

  console.log(`Syncing ${sets.length} set(s)${API_KEY ? "" : " (no API key — lower rate limit)"}`);
  let total = 0;
  for (const setId of sets) {
    try {
      const n = await syncSet(setId);
      total += n;
      console.log(`  ✓ ${setId}: ${n} cards`);
    } catch (err) {
      console.error(`  ✗ ${setId}: ${(err as Error).message}`);
    }
  }
  console.log(`Done. ${total} cards synced across ${sets.length} set(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
