"use client";

import { X, Check, ShoppingBag, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardImage, type CardIdentity } from "@/components/card-image";

/**
 * A card as it appears in a binder: the image plus its slot status
 * (owned / to-source). Renders the visual and *emits intent* — it does not
 * persist anything. Position, drag/drop, and persistence live in the container.
 *
 * `status` is a truth of the slot (binder↔card), not of the card itself, so it
 * is passed in. Interactive affordances appear only when handlers are provided,
 * which makes the same component work read-only in showcases.
 */
export function BinderCard({
  card,
  status,
  showStatus = true,
  selected,
  onToggleStatus,
  onRemove,
  onExpand,
  className,
}: {
  card: CardIdentity;
  status: "OWNED" | "WANTED";
  showStatus?: boolean;
  selected?: boolean;
  onToggleStatus?: () => void;
  onRemove?: () => void;
  onExpand?: () => void;
  className?: string;
}) {
  const owned = status === "OWNED";
  // Keep pointer interactions on affordances from arming a drag in the container.
  const stop = (e: React.PointerEvent) => e.stopPropagation();

  const chipClass = cn(
    "absolute bottom-1 left-1 right-1 rounded-md px-1.5 py-1 text-[10px] font-semibold backdrop-blur transition-colors",
    owned ? "bg-accent/85 text-accent-foreground" : "bg-primary/85 text-primary-foreground",
  );
  const chipLabel = (
    <span className="flex items-center justify-center gap-1">
      {owned ? <Check className="size-3" /> : <ShoppingBag className="size-3" />}
      {owned ? "Owned" : "Source"}
    </span>
  );

  return (
    <div
      className={cn(
        "group relative h-full w-full overflow-hidden rounded-lg",
        selected && "ring-2 ring-accent",
        className,
      )}
    >
      <CardImage card={card} variant="fill" />

      {onExpand && (
        <button
          onPointerDown={stop}
          onClick={onExpand}
          className="absolute left-1 top-1 grid size-6 place-items-center rounded-md bg-background/80 text-foreground opacity-0 backdrop-blur transition-opacity hover:bg-primary hover:text-primary-foreground group-hover:opacity-100"
          title="Card details"
        >
          <Maximize2 className="size-3.5" />
        </button>
      )}

      {onRemove && (
        <button
          onPointerDown={stop}
          onClick={onRemove}
          className="absolute right-1 top-1 grid size-6 place-items-center rounded-md bg-background/80 text-foreground opacity-0 backdrop-blur transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
          title="Remove card"
        >
          <X className="size-3.5" />
        </button>
      )}

      {showStatus &&
        (onToggleStatus ? (
          <button
            onPointerDown={stop}
            onClick={onToggleStatus}
            className={chipClass}
            title="Toggle owned / to source"
          >
            {chipLabel}
          </button>
        ) : (
          <span className={chipClass}>{chipLabel}</span>
        ))}
    </div>
  );
}
