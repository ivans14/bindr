"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
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
import {
  Search,
  ShoppingBag,
  Plus,
  Loader2,
  GripVertical,
  Upload,
  X,
  Layers,
  ImagePlus,
  Sparkles,
} from "lucide-react";
import { formatEur } from "@/lib/format";
import {
  searchCards,
  placeCard,
  clearSlot,
  setSlotStatus,
  moveSlot,
  addPage,
  importCards,
  setSleeve,
  setCustomImage,
  updateBinderMeta,
  similarCards,
} from "@/app/actions/binders";
import { type CardFilters as Filters, hasActiveFilters, DEFAULT_LANGUAGE } from "@/lib/card-query";
import { THEMES, themeBackground, SLEEVES, sleeveBackground } from "@/lib/binder-style";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CardImage, type CardIdentity } from "@/components/card-image";
import { BinderCard } from "@/components/binder-card";
import { CardFilters } from "@/components/card-filters";
import { BrandMark } from "@/components/brand-mark";

const SLOTS_PER_PAGE = 9;

type ImportSummary = Awaited<ReturnType<typeof importCards>>;

type CardLite = CardIdentity & { id: string };

type SearchResult = CardLite & { priceEur: number | null };

type Slot = {
  position: number;
  status: "EMPTY" | "OWNED" | "WANTED";
  card: CardLite | null;
  sleeve: string | null;
  customImage: string | null;
  priceEur: number | null;
};

export function BinderBuilder({
  binderId,
  pageCount,
  initialSlots,
  sets,
  theme,
}: {
  binderId: string;
  pageCount: number;
  initialSlots: Slot[];
  sets: { id: string; name: string; language: string }[];
  theme: string;
}) {
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [pages, setPages] = useState(pageCount);
  const [themeKey, setThemeKey] = useState(theme);
  const [filters, setFilters] = useState<Filters>({ language: DEFAULT_LANGUAGE });
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

  // Debounced search whenever the query or any filter changes.
  useEffect(() => {
    if (!hasActiveFilters(filters)) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      startSearch(async () => setResults(await searchCards(filters)));
    }, 250);
    return () => clearTimeout(t);
  }, [filters]);

  function place(position: number, card: SearchResult) {
    setSlots((prev) =>
      prev.map((s) =>
        s.position === position
          ? { ...s, card, status: "WANTED", priceEur: card.priceEur, sleeve: null, customImage: null }
          : s,
      ),
    );
    startMutate(() => {
      placeCard({ binderId, position, cardId: card.id });
    });
  }

  function placeSleeve(position: number, sleeve: string) {
    setSlots((prev) =>
      prev.map((s) =>
        s.position === position
          ? { ...s, sleeve, card: null, status: "EMPTY", priceEur: null, customImage: null }
          : s,
      ),
    );
    startMutate(() => {
      setSleeve(binderId, position, sleeve);
    });
  }

  function placeCustomImage(position: number, url: string) {
    setSlots((prev) =>
      prev.map((s) =>
        s.position === position
          ? { ...s, customImage: url, card: null, status: "EMPTY", priceEur: null, sleeve: null }
          : s,
      ),
    );
    startMutate(() => {
      setCustomImage(binderId, position, url);
    });
  }

  function changeTheme(key: string) {
    setThemeKey(key);
    startMutate(() => {
      updateBinderMeta({ binderId, theme: key });
    });
  }

  function nextEmpty(): number | null {
    return target ?? slots.find((s) => !s.card && !s.sleeve && !s.customImage)?.position ?? null;
  }

  function matchVibe() {
    startSearch(async () => {
      setResults(await similarCards(binderId));
    });
  }

  function moveCard(from: number, to: number) {
    if (from === to) return;
    setSlots((prev) => {
      const a = prev.find((s) => s.position === from);
      const b = prev.find((s) => s.position === to);
      if (!a) return prev;
      const content = (x?: Slot) => ({
        card: x?.card ?? null,
        status: x?.status ?? ("EMPTY" as const),
        priceEur: x?.priceEur ?? null,
        sleeve: x?.sleeve ?? null,
        customImage: x?.customImage ?? null,
      });
      return prev.map((s) => {
        if (s.position === from) return { ...s, ...content(b) };
        if (s.position === to) return { ...s, ...content(a) };
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
        s.position === position
          ? { ...s, card: null, status: "EMPTY", priceEur: null, sleeve: null, customImage: null }
          : s,
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
          sleeve: null,
          customImage: null,
          priceEur: null,
        })),
      ]);
      setPages((p) => p + 1);
    });
  }

  async function importFromCsv(text: string): Promise<ImportSummary> {
    const res = await importCards(binderId, text);
    setSlots((prev) => {
      const map = new Map(prev.map((s) => [s.position, s]));
      for (const pl of res.placements) {
        map.set(pl.position, {
          position: pl.position,
          status: pl.status,
          card: pl.card,
          sleeve: null,
          customImage: null,
          priceEur: pl.priceEur,
        });
      }
      // Fill any gaps created by new pages with empty slots.
      for (let p = 0; p < res.pageCount * SLOTS_PER_PAGE; p++) {
        if (!map.has(p))
          map.set(p, {
            position: p,
            status: "EMPTY",
            card: null,
            sleeve: null,
            customImage: null,
            priceEur: null,
          });
      }
      return [...map.values()].sort((a, b) => a.position - b.position);
    });
    setPages(res.pageCount);
    return res;
  }

  const pageArray = Array.from({ length: pages }, (_, p) =>
    slots.filter((s) => Math.floor(s.position / SLOTS_PER_PAGE) === p),
  );

  return (
    <DndContext id="binder-dnd" sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Binder pages — laid out left to right like a real binder */}
        <div className="min-w-0">
          {/* Background picker */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Background
            </span>
            {THEMES.map((t) => (
              <button
                key={t.key}
                onClick={() => changeTheme(t.key)}
                title={t.label}
                style={{ background: t.background }}
                className={cn(
                  "size-6 rounded-md border transition-transform hover:scale-110",
                  themeKey === t.key ? "border-primary ring-2 ring-primary/50" : "border-border",
                )}
              />
            ))}
          </div>

          <div className="flex gap-5 overflow-x-auto pb-3">
            {pageArray.map((pageSlots, p) => (
              <div key={p} className="w-[19rem] shrink-0 sm:w-[22rem]">
                <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Page {p + 1}
                </div>
                <div
                  className="grid grid-cols-3 gap-3 rounded-2xl border border-border p-3 sm:gap-3.5 sm:p-4"
                  style={{ background: themeBackground(themeKey) }}
                >
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

            {/* Add page as a column at the end */}
            <div className="flex w-28 shrink-0 flex-col">
              <div className="mb-2 text-xs">&nbsp;</div>
              <button
                onClick={onAddPage}
                className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
              >
                <Plus className="size-5" /> Add page
              </button>
            </div>
          </div>
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
            {totals.wanted > 0 ? (
              <Button asChild className="mt-4 w-full gap-2">
                <Link href={`/binders/${binderId}/request`}>
                  <ShoppingBag className="size-4" /> Request build
                </Link>
              </Button>
            ) : (
              <Button className="mt-4 w-full gap-2" disabled title="Mark cards to source first">
                <ShoppingBag className="size-4" /> Request build
              </Button>
            )}
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              We source the “to source” cards and ship the finished binder.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.query ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
                placeholder="Search cards…"
                className="pl-9"
              />
            </div>

            <div className="mt-3">
              <CardFilters value={filters} sets={sets} onChange={setFilters} />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full gap-2"
              onClick={matchVibe}
              title="Suggest cards that match your binder's types, rarity, artists & era"
            >
              <Sparkles className="size-4 text-accent" /> Match this binder&apos;s vibe
            </Button>

            <p className="mt-2 text-[11px] text-muted-foreground">
              {target != null
                ? `Placing into slot ${target + 1} — click a card or drag it in.`
                : "Drag a card onto a pocket, or click a pocket first."}
            </p>

            <div className="mt-2 max-h-[46vh] space-y-1.5 overflow-y-auto pr-1">
              {searching && (
                <div className="flex justify-center py-6 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              )}
              {!searching && hasActiveFilters(filters) && results.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">No cards found.</p>
              )}
              {results.map((card) => (
                <ResultRow key={card.id} card={card} onClick={() => clickPlace(card)} />
              ))}
            </div>
          </div>

          <SleevesPanel
            onPick={(key) => {
              const pos = nextEmpty();
              if (pos == null) return;
              placeSleeve(pos, key);
              setTarget(null);
            }}
          />

          <CustomImagePanel
            onUploaded={(url) => {
              const pos = nextEmpty();
              if (pos == null) return;
              placeCustomImage(pos, url);
              setTarget(null);
            }}
          />

          <CsvImport onImport={importFromCsv} />
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

  const empty = !slot.card && !slot.sleeve && !slot.customImage;

  return (
    <div
      ref={setNodeRef}
      onClick={empty ? onSelect : undefined}
      className={
        "relative aspect-[63/88] overflow-hidden rounded-lg border transition-all " +
        (isOver
          ? "border-primary ring-2 ring-primary"
          : selected
            ? "border-accent ring-2 ring-accent"
            : "border-border") +
        (empty ? " pocket-empty cursor-pointer hover:border-primary/50" : "")
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
      ) : slot.sleeve ? (
        <div
          className="group relative h-full w-full"
          style={{ background: sleeveBackground(slot.sleeve) ?? undefined }}
        >
          <span className="absolute inset-0 grid place-items-center">
            <BrandMark className="size-8 opacity-40" />
          </span>
          <SlotRemove onRemove={onRemove} />
        </div>
      ) : slot.customImage ? (
        <div className="group relative h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slot.customImage} alt="" className="h-full w-full object-cover" />
          <SlotRemove onRemove={onRemove} />
        </div>
      ) : (
        <span className="absolute inset-0 grid place-items-center text-xs text-muted-foreground/60">
          {slot.position + 1}
        </span>
      )}
    </div>
  );
}

function SlotRemove({ onRemove }: { onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      className="absolute right-1 top-1 grid size-6 place-items-center rounded-md bg-background/80 text-foreground opacity-0 backdrop-blur transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
      title="Remove"
    >
      <X className="size-3.5" />
    </button>
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

function SleevesPanel({ onPick }: { onPick: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <Layers className="size-4" /> Sleeves
      </button>
      {open && (
        <div className="mt-3">
          <p className="mb-2 text-[11px] text-muted-foreground">
            Click a sleeve to drop it into the selected (or next empty) pocket.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {SLEEVES.map((s) => (
              <button
                key={s.key}
                onClick={() => onPick(s.key)}
                title={s.label}
                style={{ background: s.background }}
                className="relative aspect-[63/88] overflow-hidden rounded-md border border-border transition-transform hover:scale-[1.04] hover:border-primary/60"
              >
                <span className="absolute inset-0 grid place-items-center">
                  <BrandMark className="size-5 opacity-40" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomImagePanel({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      onUploaded(data.url);
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ImagePlus className="size-4" /> Custom image
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Upload your own art (PNG/JPG/WebP, ≤ 4 MB) into the selected or next empty pocket —
            handy for proxies or things you plan to print.
          </p>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={onFile}
            disabled={busy}
            className="w-full text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs file:text-secondary-foreground"
          />
          {busy && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Uploading…
            </div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}

function CsvImport({ onImport }: { onImport: (text: string) => Promise<ImportSummary> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportSummary | null>(null);

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      setResult(await onImport(text));
      setText("");
    } finally {
      setBusy(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) f.text().then(setText);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <Upload className="size-4" /> Bulk import (CSV)
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-muted-foreground">
            One card per line: <code>name,set,number,status</code> (status = owned/wanted).
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={"Charizard,Base,4,owned\nPikachu,151,25,wanted"}
            className="w-full rounded-lg border border-input bg-background/40 p-2 font-mono text-xs placeholder:text-muted-foreground"
          />
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={onFile}
              className="min-w-0 flex-1 text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs file:text-secondary-foreground"
            />
            <Button size="sm" className="gap-1.5" onClick={submit} disabled={busy || !text.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Import
            </Button>
          </div>
          {result && (
            <div className="rounded-lg border border-border bg-muted/40 p-2 text-xs">
              <div className="font-medium text-foreground">
                Imported {result.placed} card{result.placed === 1 ? "" : "s"}
                {result.pagesAdded > 0 &&
                  ` · +${result.pagesAdded} page${result.pagesAdded === 1 ? "" : "s"}`}
              </div>
              {result.unmatched.length > 0 && (
                <div className="mt-1 text-muted-foreground">
                  {result.unmatched.length} not matched:
                  <ul className="mt-0.5 max-h-24 list-inside list-disc overflow-y-auto">
                    {result.unmatched.slice(0, 20).map((u, i) => (
                      <li key={i} className="truncate">
                        {u}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
