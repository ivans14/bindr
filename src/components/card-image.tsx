import { cn } from "@/lib/utils";

/** The identity of a card — enough for the component to render it. */
export type CardIdentity = {
  name: string;
  number: string;
  setName: string;
  imageBase: string | null; // TCGdex asset base; null when the card has no image
};

/** TCGdex images resolve as `{base}/{quality}.png`. */
export function cardImageUrl(imageBase: string, quality: "high" | "low" = "high") {
  return `${imageBase}/${quality}.png`;
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
  className,
}: {
  card: CardIdentity;
  variant?: keyof typeof variants;
  className?: string;
}) {
  const box = cn(variants[variant], className);
  const label = `${card.name} · ${card.setName} #${card.number}`;

  if (!card.imageBase) {
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
      src={cardImageUrl(card.imageBase, variant === "thumb" ? "low" : "high")}
      alt={label}
      title={label}
      draggable={false}
      className={cn("object-cover", box)}
    />
  );
}
