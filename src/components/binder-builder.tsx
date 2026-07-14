"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Search, ShoppingBag, Plus, Loader2, GripVertical } from "lucide-react";
import { formatEur } from "@/lib/format";
import {
  searchCards,
  placeCard,
  clearSlot,
  setSlotStatus,
  moveSlot,
  addPage,
} from "@/app/actions/binders";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardImage, type CardIdentity } from "@/components/card-image";
import { BinderCard } from "@/components/binder-card";

const SLOTS_PER_PAGE = 9;

type CardLite = CardIdentity & { id: string };

type SearchResult = CardLite & { priceEur: number | null };

type Slot = {
  position: number;
  status: "EMPTY" | "OWNED" | "WANTED";
  card: CardLite | null;
  priceEur: number | null;
};

export function BinderBuilder({
  binderId,
  pageCount,
  initialSlots,
}: {
  binderId: string;
  pageCount: number;
  initialSlots: Slot[];
}) {
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [pages, setPages] = useState(pageCount);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, startSearch] = useTransition();
  const [, startMutate] = useTransition();
  const [activeCard, setActiveCard] = useState<SearchResult | null>(null);
  const [activeWidth, setActiveWidth] = useState(170);
  const [target, setTarget] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const totals = useMemo(() => {
    let total = 0,
      owned = 0,
      wanted = 0,
      cards = 0;
    for (const s of slots) {
      if (!s.card) continue;
      cards++;
      const p = s.priceEur ?? 0;
      total += p;
      if (s.status === "OWNED") owned += p;
      else wanted += p;
    }
    return { total, owned, wanted, cards };
  }, [slots]);

  function runSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    startSearch(async () => {
      setResults(await searchCards(q));
    });
  }

  function place(position: number, card: SearchResult) {
    setSlots((prev) =>
      prev.map((s) =>
        s.position === position
          ? { ...s, card, status: "WANTED", priceEur: card.priceEur }
          : s,
      ),
    );
    startMutate(() => {
      placeCard({ binderId, position, cardId: card.id });
    });
  }

  function moveCard(from: number, to: number) {
    if (from === to) return;
    setSlots((prev) => {
      const a = prev.find((s) => s.position === from);
      const b = prev.find((s) => s.position === to);
      if (!a) return prev;
      return prev.map((s) => {
        if (s.position === from)
          return b?.card
            ? { ...s, card: b.card, status: b.status, priceEur: b.priceEur }
            : { ...s, card: null, status: "EMPTY", priceEur: null };
        if (s.position === to)
          return { ...s, card: a.card, status: a.status, priceEur: a.priceEur };
        return s;
      });
    });
    startMutate(() => {
      moveSlot(binderId, from, to);
    });
  }

  function remove(position: number) {
    setSlots((prev) =>
      prev.map((s) =>
        s.position === position ? { ...s, card: null, status: "EMPTY", priceEur: null } : s,
      ),
    );
    startMutate(() => {
      clearSlot(binderId, position);
    });
  }

  function toggleStatus(position: number) {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.position !== position || !s.card) return s;
        return { ...s, status: s.status === "OWNED" ? "WANTED" : "OWNED" };
      }),
    );
    const cur = slots.find((s) => s.position === position);
    const next = cur?.status === "OWNED" ? "WANTED" : "OWNED";
    startMutate(() => {
      setSlotStatus(binderId, position, next);
    });
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveCard((e.active.data.current?.card as SearchResult) ?? null);
    // Match the overlay to the pocket card being lifted; search-thumb drags use a standard card size.
    const id = String(e.active.id);
    if (id.startsWith("placed-")) {
      const node = document.querySelector(`[data-card-slot="${id.slice("placed-".length)}"]`);
      const w = node?.getBoundingClientRect().width ?? 180;
      setActiveWidth(Math.min(Math.max(w, 150), 300));
    } else {
      setActiveWidth(180);
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveCard(null);
    const data = e.active.data.current;
    const to = e.over?.data.current?.position as number | undefined;
    if (typeof to !== "number" || !data) return;
    if (typeof data.fromPosition === "number") {
      moveCard(data.fromPosition, to); // rearrange within the binder
    } else if (data.card) {
      place(to, data.card as SearchResult); // place from search
    }
  }

  // Clicking a result places into the selected target, else first empty slot.
  function clickPlace(card: SearchResult) {
    const pos = target ?? slots.find((s) => !s.card)?.position;
    if (pos == null) return;
    place(pos, card);
    setTarget(null);
  }

  function onAddPage() {
    startMutate(async () => {
      await addPage(binderId);
      setSlots((prev) => [
        ...prev,
        ...Array.from({ length: SLOTS_PER_PAGE }, (_, i) => ({
          position: pages * SLOTS_PER_PAGE + i,
          status: "EMPTY" as const,
          card: null,
          priceEur: null,
        })),
      ]);
      setPages((p) => p + 1);
    });
  }

  const pageArray = Array.from({ length: pages }, (_, p) =>
    slots.filter((s) => Math.floor(s.position / SLOTS_PER_PAGE) === p),
  );

  return (
    <DndContext id="binder-dnd" sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Binder pages */}
        <div className="space-y-8">
          {pageArray.map((pageSlots, p) => (
            <div key={p}>
              <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                Page {p + 1}
              </div>
              <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border bg-card/40 p-3 sm:gap-4 sm:p-4">
                {pageSlots.map((slot) => (
                  <SlotCell
                    key={slot.position}
                    slot={slot}
                    selected={target === slot.position}
                    onSelect={() => setTarget(target === slot.position ? null : slot.position)}
                    onRemove={() => remove(slot.position)}
                    onToggle={() => toggleStatus(slot.position)}
                  />
                ))}
              </div>
            </div>
          ))}

          <Button variant="outline" className="w-full gap-2" onClick={onAddPage}>
            <Plus className="size-4" /> Add page
          </Button>
        </div>

        {/* Sidebar: search + totals */}
        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <Stat label="Total value" value={formatEur(totals.total)} highlight />
              <Stat label="Cards" value={String(totals.cards)} />
              <Stat label="Owned" value={formatEur(totals.owned)} />
              <Stat label="To source" value={formatEur(totals.wanted)} accent />
            </div>
            <Button className="mt-4 w-full gap-2" disabled={totals.wanted <= 0} title="Fulfillment coming soon">
              <ShoppingBag className="size-4" /> Request build
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              We source the “to source” cards and ship the finished binder.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => runSearch(e.target.value)}
                placeholder="Search cards…"
                className="pl-9"
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {target != null
                ? `Placing into slot ${target + 1} — click a card or drag it in.`
                : "Drag a card onto a pocket, or click a pocket first."}
            </p>

            <div className="mt-3 max-h-[52vh] space-y-1.5 overflow-y-auto pr-1">
              {searching && (
                <div className="flex justify-center py-6 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              )}
              {!searching && query.length >= 2 && results.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">No cards found.</p>
              )}
              {results.map((card) => (
                <ResultRow key={card.id} card={card} onClick={() => clickPlace(card)} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="drag-lift" style={{ width: activeWidth }}>
            <CardImage
              card={activeCard}
              variant="plain"
              className="shadow-2xl shadow-black/60 ring-1 ring-white/10"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Stat({
  label,
  value,
  highlight,
  accent,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-2.5">
      <div
        className={
          "font-display text-lg font-bold " +
          (highlight ? "text-foreground" : accent ? "text-accent" : "text-foreground")
        }
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function SlotCell({
  slot,
  selected,
  onSelect,
  onRemove,
  onToggle,
}: {
  slot: Slot;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onToggle: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slot.position}`,
    data: { position: slot.position },
  });
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `placed-${slot.position}`,
    data: { fromPosition: slot.position, card: slot.card },
  });

  return (
    <div
      ref={setNodeRef}
      onClick={slot.card ? undefined : onSelect}
      className={
        "relative aspect-[63/88] overflow-hidden rounded-lg border transition-all " +
        (isOver
          ? "border-primary ring-2 ring-primary"
          : selected
            ? "border-accent ring-2 ring-accent"
            : "border-border") +
        (slot.card ? "" : " pocket-empty cursor-pointer hover:border-primary/50")
      }
    >
      {slot.card ? (
        <div
          ref={setDragRef}
          {...listeners}
          {...attributes}
          data-card-slot={slot.position}
          style={{ opacity: isDragging ? 0.25 : 1 }}
          className="h-full w-full cursor-grab touch-none transition-opacity duration-150 active:cursor-grabbing"
          title="Drag to move"
        >
          <BinderCard
            card={slot.card}
            status={slot.status === "OWNED" ? "OWNED" : "WANTED"}
            onToggleStatus={onToggle}
            onRemove={onRemove}
          />
        </div>
      ) : (
        <span className="absolute inset-0 grid place-items-center text-xs text-muted-foreground/60">
          {slot.position + 1}
        </span>
      )}
    </div>
  );
}

function ResultRow({ card, onClick }: { card: SearchResult; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `card-${card.id}`,
    data: { card },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-2.5 rounded-lg border border-transparent p-1.5 hover:border-border hover:bg-muted/50"
    >
      <button {...listeners} {...attributes} className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing">
        <GripVertical className="size-4" />
      </button>
      <CardImage card={card} variant="thumb" className="shrink-0" />
      <button onClick={onClick} className="min-w-0 flex-1 text-left">
        <div className="truncate text-sm font-medium">{card.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {card.setName} · #{card.number}
        </div>
      </button>
      <div className="shrink-0 text-right text-xs font-semibold">
        {card.priceEur != null ? formatEur(card.priceEur) : "—"}
      </div>
    </div>
  );
}
