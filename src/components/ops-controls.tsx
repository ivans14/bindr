"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";
import {
  advanceFulfillment,
  setItemSourced,
  setSourcedPrice,
  setTracking,
} from "@/app/actions/fulfillment";
import {
  NEXT_STATES,
  STATE_LABEL,
  cardmarketSearch,
  type FulfillmentState,
} from "@/lib/fulfillment";
import { formatEur } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type Item = {
  id: string;
  name: string;
  setName: string;
  number: string;
  sourced: boolean;
  priceEur: number;
  sourcedPrice: number | null;
};

export function OpsControls({
  orderId,
  state,
  items,
  carrier,
  trackingCode,
}: {
  orderId: string;
  state: FulfillmentState;
  items: Item[];
  carrier: string | null;
  trackingCode: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [localItems, setLocalItems] = useState(items);
  const [car, setCar] = useState(carrier ?? "");
  const [code, setCode] = useState(trackingCode ?? "");

  function advance(next: FulfillmentState) {
    start(async () => {
      await advanceFulfillment(orderId, next);
      router.refresh();
    });
  }
  function toggle(id: string, sourced: boolean) {
    setLocalItems((prev) => prev.map((i) => (i.id === id ? { ...i, sourced } : i)));
    start(async () => {
      await setItemSourced(orderId, id, sourced);
      router.refresh();
    });
  }
  function saveTracking(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      await setTracking(orderId, car, code);
      router.refresh();
    });
  }
  function savePrice(id: string, raw: string) {
    const n = raw.trim() === "" ? null : Number(raw);
    const clean = n != null && Number.isFinite(n) && n >= 0 ? n : null;
    setLocalItems((prev) => prev.map((i) => (i.id === id ? { ...i, sourcedPrice: clean } : i)));
    start(async () => {
      await setSourcedPrice(orderId, id, clean);
      router.refresh();
    });
  }

  const sourced = localItems.filter((i) => i.sourced).length;
  const next = NEXT_STATES[state];
  const priced = localItems.filter((i) => i.sourcedPrice != null);
  const sourcedTotal = priced.reduce((s, i) => s + (i.sourcedPrice ?? 0), 0);
  const quotedForPriced = priced.reduce((s, i) => s + i.priceEur, 0);
  const delta = sourcedTotal - quotedForPriced;

  return (
    <div className="space-y-4">
      {/* State transitions */}
      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          Advance order {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        {next.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No further transitions.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {next.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === "CANCELLED" || s === "REFUNDED" ? "outline" : "default"}
                onClick={() => advance(s)}
                disabled={pending}
              >
                {STATE_LABEL[s]}
              </Button>
            ))}
          </div>
        )}
      </Card>

      {/* Sourcing worklist */}
      <Card className="p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Sourcing worklist</h2>
          <span className="text-xs text-muted-foreground">
            {sourced}/{localItems.length} sourced
          </span>
        </div>
        {priced.length > 0 && (
          <div className="mb-3 rounded-lg bg-muted/40 px-2.5 py-1.5 text-xs">
            {priced.length}/{localItems.length} priced · actual <b>{formatEur(sourcedTotal)}</b> vs
            quoted {formatEur(quotedForPriced)}{" "}
            <span className={delta > 0 ? "text-destructive" : "text-accent"}>
              ({delta >= 0 ? "+" : ""}
              {formatEur(delta)})
            </span>
          </div>
        )}
        <ul className="space-y-1.5">
          {localItems.map((it) => (
            <li
              key={it.id}
              className="flex items-center gap-2.5 rounded-lg border border-border/60 p-2"
            >
              <input
                type="checkbox"
                checked={it.sourced}
                onChange={(e) => toggle(it.id, e.target.checked)}
                className="size-4 accent-[oklch(0.68_0.2_293)]"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{it.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {it.setName} · #{it.number}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1" title="Actual sourced cost">
                <span className="text-xs text-muted-foreground">€</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={it.sourcedPrice ?? ""}
                  onBlur={(e) => savePrice(it.id, e.target.value)}
                  placeholder={it.priceEur.toFixed(2)}
                  className="h-7 w-16 rounded border border-input bg-background/60 px-1.5 text-xs"
                />
              </div>
              <a
                href={cardmarketSearch(it.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Cardmarket <ExternalLink className="size-3" />
              </a>
            </li>
          ))}
        </ul>
      </Card>

      {/* Tracking */}
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold">Shipping</h2>
        <form onSubmit={saveTracking} className="flex flex-wrap items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Carrier</label>
            <Input value={car} onChange={(e) => setCar(e.target.value)} placeholder="PostNord / GLS" />
          </div>
          <div className="flex-[2]">
            <label className="mb-1 block text-xs text-muted-foreground">Tracking code</label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Tracking number" />
          </div>
          <Button type="submit" disabled={pending || !code.trim()}>
            Mark shipped
          </Button>
        </form>
      </Card>
    </div>
  );
}
