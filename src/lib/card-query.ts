// Shared, pure definitions for card filtering (safe in client and server).

export type CardSort = "relevance" | "priceDesc" | "priceAsc" | "name" | "number";

export type CardFilters = {
  query?: string;
  language?: string; // en | es | ja … (context, not a result-triggering filter)
  supertype?: string; // Pokémon | Trainer | Energy
  types?: string[]; // energy types
  subtypes?: string[]; // Basic, Stage 2, ex, Supporter, Stadium, …
  artist?: string; // free-text (contains)
  setId?: string;
  fullArt?: boolean;
  sort?: CardSort; // result ordering (applied in the DB, not client-side)
};

// Languages we surface. Limited to English + Japanese (ES/KO excluded).
export const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "ja", label: "日本語" },
] as const;

export const DEFAULT_LANGUAGE = "en";

export const SUPERTYPES = ["Pokémon", "Trainer", "Energy"] as const;

// Fixed domain — the canonical TCG energy types.
export const POKEMON_TYPES = [
  "Grass",
  "Fire",
  "Water",
  "Lightning",
  "Psychic",
  "Fighting",
  "Darkness",
  "Metal",
  "Fairy",
  "Dragon",
  "Colorless",
] as const;

export const SUBTYPES = [
  "Basic",
  "Stage 1",
  "Stage 2",
  "ex",
  "V",
  "VMAX",
  "VSTAR",
  "GX",
  "Supporter",
  "Item",
  "Stadium",
  "Pokémon Tool",
  "Special",
] as const;

// Rough type→color, also the seed for a future "color" filter.
export const TYPE_COLOR: Record<string, string> = {
  Grass: "#5fa855",
  Fire: "#e2542a",
  Water: "#2f8fd8",
  Lightning: "#f2c033",
  Psychic: "#9a5bd0",
  Fighting: "#b5602f",
  Darkness: "#45465a",
  Metal: "#8a95a5",
  Fairy: "#e26fae",
  Dragon: "#b79419",
  Colorless: "#b9b9c2",
};

export function hasActiveFilters(f: CardFilters): boolean {
  return Boolean(
    (f.query && f.query.trim().length >= 2) ||
      f.supertype ||
      f.artist ||
      f.setId ||
      f.fullArt ||
      f.types?.length ||
      f.subtypes?.length,
  );
}
