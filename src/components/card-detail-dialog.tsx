"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, Loader2 } from "lucide-react";
import { getCardDetail } from "@/app/actions/binders";
import { CardImage } from "@/components/card-image";
import { TypeIcon } from "@/components/type-icon";
import { formatEur } from "@/lib/format";
import { Button } from "@/components/ui/button";

type Detail = Awaited<ReturnType<typeof getCardDetail>>;

export function CardDetailDialog({
  cardId,
  onClose,
}: {
  cardId: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Detail>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cardId) {
      setDetail(null);
      return;
    }
    let live = true;
    setLoading(true);
    getCardDetail(cardId).then((d) => {
      if (live) {
        setDetail(d);
        setLoading(false);
      }
    });
    return () => {
      live = false;
    };
  }, [cardId]);

  useEffect(() => {
    if (!cardId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cardId, onClose]);

  if (!cardId) return null;
  const q = detail ? encodeURIComponent(detail.name) : "";
  const cmUrl = `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${q}`;
  const tpUrl = `https://www.tcgplayer.com/search/pokemon/product?q=${q}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-lg bg-background/70 hover:bg-muted"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        {loading || !detail ? (
          <div className="flex h-80 items-center justify-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-5 p-5 sm:grid-cols-[240px_1fr]">
            <CardImage card={detail} variant="plain" className="mx-auto w-full max-w-[240px] ring-1 ring-white/10" />
            <div>
              <h2 className="font-display text-2xl font-bold">{detail.name}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {detail.setName} · #{detail.number}
              </p>
              {detail.types.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  {detail.types.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1">
                      <TypeIcon type={t} className="size-4" />
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <dl className="mt-4 space-y-1.5 text-sm">
                {detail.rarity && <Row label="Rarity" value={detail.rarity} />}
                {detail.artist && <Row label="Illustrator" value={detail.artist} />}
                {detail.supertype && <Row label="Category" value={detail.supertype} />}
              </dl>
              <div className="mt-4 flex gap-6">
                <div>
                  <div className="text-xs text-muted-foreground">Cardmarket</div>
                  <div className="text-lg font-bold">
                    {detail.eur != null ? formatEur(detail.eur) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">TCGplayer</div>
                  <div className="text-lg font-bold">
                    {detail.usd != null ? `$${detail.usd.toFixed(2)}` : "—"}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild size="sm" className="gap-1.5">
                  <a href={cmUrl} target="_blank" rel="noopener noreferrer">
                    Buy on Cardmarket <ExternalLink className="size-3.5" />
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <a href={tpUrl} target="_blank" rel="noopener noreferrer">
                    TCGplayer <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
