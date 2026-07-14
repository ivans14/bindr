/**
 * Sync cards from TCGdex (https://api.tcgdex.net) into Card / PriceSnapshot.
 * TCGdex is a single source for localized names, localized images, and
 * Cardmarket (EUR) + TCGplayer (USD) pricing.
 *
 *   pnpm sync:cards                     # default language/set targets
 *   pnpm sync:cards en:sv03.5 ja:SV2a   # explicit lang:setId targets
 *
 * Note: Japanese/Korean sets have their own ids (JP 151 = SV2a, not sv03.5).
 */
import { prisma } from "../src/lib/prisma";

const BASE = "https://api.tcgdex.net/v2";

// lang → set ids to pull. Western sets share ids across en/es/fr/…; JP sets differ.
const DEFAULT_TARGETS: { lang: string; sets: string[] }[] = [
  { lang: "en", sets: ["sv03.5", "base1"] },
  { lang: "es", sets: ["sv03.5"] },
  { lang: "ja", sets: ["SV2a"] },
];

type Brief = { id: string; localId?: string; name?: string };
type Pricing = {
  cardmarket?: { unit?: string; trend?: number | null; avg?: number | null; avg30?: number | null };
  tcgplayer?: Record<string, { marketPrice?: number | null } | string | undefined>;
};
type FullCard = {
  id: string;
  localId?: string;
  name?: string;
  category?: string;
  rarity?: string;
  types?: string[];
  stage?: string;
  suffix?: string;
  trainerType?: string;
  illustrator?: string;
  image?: string;
  pricing?: Pricing;
};

async function j<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

function toSupertype(category?: string): string | null {
  if (!category) return null;
  if (/pok[eé]mon/i.test(category)) return "Pokémon";
  if (/trainer/i.test(category)) return "Trainer";
  if (/energy/i.test(category)) return "Energy";
  return category;
}

function toSubtypes(c: FullCard): string[] {
  const out: string[] = [];
  if (c.stage) out.push(c.stage.replace(/^Stage(\d)$/, "Stage $1"));
  if (c.suffix) out.push(c.suffix);
  if (c.trainerType) out.push(c.trainerType === "Tool" ? "Pokémon Tool" : c.trainerType);
  return out;
}

const FULL_ART =
  /illustration|full art|ultra|rainbow|secret|hyper|gold|amazing|radiant|gallery|shiny|special|character/i;
function isFullArt(c: FullCard): boolean {
  if (c.rarity && FULL_ART.test(c.rarity)) return true;
  return Boolean(c.suffix && /vmax|vstar/i.test(c.suffix));
}

function cardmarketEur(p?: Pricing): number | null {
  const cm = p?.cardmarket;
  if (!cm) return null;
  return cm.trend ?? cm.avg ?? cm.avg30 ?? null;
}

function tcgplayerUsd(p?: Pricing): number | null {
  const tp = p?.tcgplayer;
  if (!tp) return null;
  for (const [k, v] of Object.entries(tp)) {
    if (k === "unit" || k === "updated" || typeof v !== "object" || !v) continue;
    if (typeof v.marketPrice === "number") return v.marketPrice;
  }
  return null;
}

async function chunk<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

async function syncSet(lang: string, setId: string): Promise<number> {
  const set = await j<{ name?: string; serie?: { name?: string }; releaseDate?: string; cards?: Brief[] }>(
    `${BASE}/${lang}/sets/${setId}`,
  );
  if (!set?.cards?.length) return 0;
  const setName = set.name ?? setId;
  const setSeries = set.serie?.name ?? null;
  const releasedAt = set.releaseDate ? new Date(set.releaseDate) : null;

  let count = 0;
  await chunk(set.cards, 8, async (brief) => {
    const c = await j<FullCard>(`${BASE}/${lang}/cards/${brief.id}`);
    if (!c) return;
    const id = `${lang}:${c.id}`;
    const data = {
      tcgdexId: c.id,
      language: lang,
      name: c.name ?? brief.name ?? c.id,
      number: c.localId ?? brief.localId ?? "",
      setId,
      setName,
      setSeries,
      rarity: c.rarity ?? null,
      supertype: toSupertype(c.category),
      subtypes: toSubtypes(c),
      types: c.types ?? [],
      artist: c.illustrator ?? null,
      isFullArt: isFullArt(c),
      imageBase: c.image ?? null,
      releasedAt,
    };
    await prisma.card.upsert({ where: { id }, create: { id, ...data }, update: data });

    const eur = cardmarketEur(c.pricing);
    if (eur != null) {
      await prisma.priceSnapshot.create({
        data: { cardId: id, source: "cardmarket", price: eur, currency: "EUR" },
      });
    }
    const usd = tcgplayerUsd(c.pricing);
    if (usd != null) {
      await prisma.priceSnapshot.create({
        data: { cardId: id, source: "tcgplayer", price: usd, currency: "USD" },
      });
    }
    count++;
  });
  return count;
}

async function main() {
  const args = process.argv.slice(2);
  const targets = args.length
    ? args.map((a) => {
        const [lang, setId] = a.split(":");
        return { lang, sets: [setId] };
      })
    : DEFAULT_TARGETS;

  let total = 0;
  for (const { lang, sets } of targets) {
    for (const setId of sets) {
      const n = await syncSet(lang, setId);
      total += n;
      console.log(`  ${n ? "✓" : "✗"} ${lang}:${setId} — ${n} cards`);
    }
  }
  console.log(`Done. ${total} card rows synced.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
