/**
 * Card data is not seeded here — it is synced from pokemontcg.io:
 *   pnpm sync:cards            # curated default sets
 *   pnpm sync:cards --all      # everything (slow)
 *
 * This file exists so `prisma db seed` has an entrypoint and is a place to
 * add demo/reference data later.
 */
async function main() {
  console.log("Nothing to seed. Run `pnpm sync:cards` to populate the Card table.");
}

main();
