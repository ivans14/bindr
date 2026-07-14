import { cn } from "@/lib/utils";

/** The identity of a card — enough for the component to render it. */
export type CardIdentity = {
  name: string;
  number: string;
  setId: string;
  setName: string;
};

const CDN = "https://images.pokemontcg.io";

/** pokemontcg.io images are derivable from a card's set id + collector number. */
export function cardImageUrl(setId: string, number: string, size: "small" | "large" = "small") {
  const suffix = size === "large" ? "_hires" : "";
  return `${CDN}/${setId}/${encodeURIComponent(number)}${suffix}.png`;
}

const variants = {
  fill: "h-full w-full", // fills its container (binder pockets)
  thumb: "h-14 w-10 rounded-md", // search results
  plain: "w-full rounded-lg", // width-driven; height follows the card's aspect
} as const;

/**
 * Renders a single Pokémon card. Callers pass the card's identity only — the
 * component owns image resolution, sizing, alt text, and the missing-image
 * fallback. (Distinct from the `Card` layout primitive.)
 */
export function CardImage({
  card,
  variant = "fill",
  size = "small",
  className,
}: {
  card: CardIdentity;
  variant?: keyof typeof variants;
  size?: "small" | "large";
  className?: string;
}) {
  const box = cn(variants[variant], className);
  const label = `${card.name} · ${card.setName} #${card.number}`;

  if (!card.setId || !card.number) {
    return (
      <div
        className={cn(
          "grid place-items-center bg-muted p-1 text-center text-[10px] leading-tight text-muted-foreground",
          box,
        )}
      >
        <span>{card.name}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cardImageUrl(card.setId, card.number, size)}
      alt={label}
      title={label}
      draggable={false}
      className={cn("object-cover", box)}
    />
  );
}
