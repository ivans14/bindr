import { CardImage, type CardIdentity } from "@/components/card-image";

/** A fanned preview of a binder's first few cards, for dashboard/showcase cards. */
export function BinderCover({ cards }: { cards: CardIdentity[] }) {
  if (cards.length === 0) {
    return (
      <div className="pocket-empty flex h-28 items-center justify-center rounded-xl text-xs text-muted-foreground">
        Empty binder
      </div>
    );
  }
  const shown = cards.slice(0, 5);
  const mid = (shown.length - 1) / 2;
  return (
    <div className="flex h-28 items-center justify-center overflow-hidden rounded-xl bg-muted/20">
      {shown.map((c, i) => (
        <div
          key={i}
          className="drop-shadow-lg"
          style={{
            transform: `rotate(${(i - mid) * 7}deg) translateY(${Math.abs(i - mid) * 4}px)`,
            marginLeft: i ? "-16px" : 0,
            zIndex: i,
          }}
        >
          <CardImage card={c} variant="thumb" className="h-24 w-[62px] rounded-md" />
        </div>
      ))}
    </div>
  );
}
