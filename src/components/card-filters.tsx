"use client";

import { useState } from "react";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import {
  type CardFilters,
  SUPERTYPES,
  POKEMON_TYPES,
  SUBTYPES,
  TYPE_COLOR,
  LANGUAGES,
  DEFAULT_LANGUAGE,
  hasActiveFilters,
} from "@/lib/card-query";
import { cn } from "@/lib/utils";
import { TypeIcon } from "@/components/type-icon";

function toggle<T>(arr: T[] | undefined, v: T): T[] {
  const set = new Set(arr ?? []);
  set.has(v) ? set.delete(v) : set.add(v);
  return [...set];
}

const chip =
  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer select-none";

export function CardFilters({
  value,
  sets,
  artists,
  onChange,
}: {
  value: CardFilters;
  sets: { id: string; name: string; language: string }[];
  artists: string[];
  onChange: (next: CardFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<CardFilters>) => onChange({ ...value, ...patch });
  const active = hasActiveFilters({ ...value, query: undefined }); // ignore text query here
  const lang = value.language ?? DEFAULT_LANGUAGE;
  const langSets = sets.filter((s) => s.language === lang);

  return (
    <div className="relative rounded-lg border border-border bg-background/40">
      {/* Language — primary context, always visible */}
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <span className="mr-1 text-[10px] uppercase tracking-wide text-muted-foreground">Lang</span>
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => set({ language: l.code, setId: undefined })}
            className={cn(
              chip,
              lang === l.code
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <SlidersHorizontal className="size-4" />
          Filters
          {active && <span className="size-1.5 rounded-full bg-accent" />}
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
        {active && (
          <button
            onClick={() => onChange({ query: value.query, language: value.language })}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" /> Clear
          </button>
        )}
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-[70vh] space-y-3 overflow-y-auto rounded-xl border border-border bg-popover p-3 shadow-2xl">
          <Group label="Category">
            {SUPERTYPES.map((s) => (
              <button
                key={s}
                onClick={() => set({ supertype: value.supertype === s ? undefined : s })}
                className={cn(
                  chip,
                  value.supertype === s
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </Group>

          <Group label="Type">
            {POKEMON_TYPES.map((t) => {
              const on = value.types?.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => set({ types: toggle(value.types, t) })}
                  title={t}
                  className={cn(
                    "grid size-8 place-items-center rounded-full border transition-all hover:scale-110",
                    on ? "" : "border-border opacity-70 hover:opacity-100",
                  )}
                  style={on ? { background: `${TYPE_COLOR[t]}22`, borderColor: TYPE_COLOR[t] } : undefined}
                >
                  <TypeIcon type={t} className="size-4" />
                </button>
              );
            })}
          </Group>

          <Group label="Card type">
            {SUBTYPES.map((s) => {
              const on = value.subtypes?.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => set({ subtypes: toggle(value.subtypes, s) })}
                  className={cn(
                    chip,
                    on
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </Group>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => set({ fullArt: value.fullArt ? undefined : true })}
              className={cn(
                chip,
                value.fullArt
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              ✦ Full art
            </button>
          </div>

          <div className="grid gap-2">
            <Combobox
              items={langSets.map((s) => ({ value: s.id, label: s.name }))}
              value={value.setId}
              onChange={(id) => set({ setId: id })}
              placeholder="All sets"
              clearLabel="All sets"
            />
            <Combobox
              items={artists.map((a) => ({ value: a, label: a }))}
              value={value.artist}
              onChange={(a) => set({ artist: a })}
              placeholder="Any artist"
              clearLabel="Any artist"
            />
          </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Always-visible summary of applied filters as removable chips. */
export function ActiveFilters({
  value,
  sets,
  onChange,
}: {
  value: CardFilters;
  sets: { id: string; name: string }[];
  onChange: (next: CardFilters) => void;
}) {
  const chips: { key: string; label: string; type?: string; onRemove: () => void }[] = [];
  if (value.supertype)
    chips.push({
      key: "sup",
      label: value.supertype,
      onRemove: () => onChange({ ...value, supertype: undefined }),
    });
  (value.types ?? []).forEach((t) =>
    chips.push({
      key: `t-${t}`,
      label: t,
      type: t,
      onRemove: () => onChange({ ...value, types: value.types!.filter((x) => x !== t) }),
    }),
  );
  (value.subtypes ?? []).forEach((s) =>
    chips.push({
      key: `s-${s}`,
      label: s,
      onRemove: () => onChange({ ...value, subtypes: value.subtypes!.filter((x) => x !== s) }),
    }),
  );
  if (value.fullArt)
    chips.push({ key: "fa", label: "✦ Full art", onRemove: () => onChange({ ...value, fullArt: undefined }) });
  if (value.setId)
    chips.push({
      key: "set",
      label: sets.find((s) => s.id === value.setId)?.name ?? "Set",
      onRemove: () => onChange({ ...value, setId: undefined }),
    });
  if (value.artist?.trim())
    chips.push({ key: "art", label: value.artist, onRemove: () => onChange({ ...value, artist: undefined }) });

  if (chips.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <button
          key={c.key}
          onClick={c.onRemove}
          className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25"
          title="Remove filter"
        >
          {c.type && <TypeIcon type={c.type} className="size-3" />}
          {c.label}
          <X className="size-3" />
        </button>
      ))}
    </div>
  );
}

function Combobox({
  items,
  value,
  onChange,
  placeholder,
  clearLabel,
}: {
  items: { value: string; label: string }[];
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder: string;
  clearLabel: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.value === value);
  const filtered = (
    q ? items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())) : items
  ).slice(0, 60);

  return (
    <div className="relative">
      <input
        value={open ? q : (selected?.label ?? "")}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQ("");
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-input bg-background/60 px-3 text-sm placeholder:text-muted-foreground"
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-xl">
          <button
            onMouseDown={() => {
              onChange(undefined);
              setOpen(false);
            }}
            className="block w-full px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
          >
            {clearLabel}
          </button>
          {filtered.map((i) => (
            <button
              key={i.value}
              onMouseDown={() => {
                onChange(i.value);
                setOpen(false);
              }}
              className={cn(
                "block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-muted",
                i.value === value && "text-primary",
              )}
            >
              {i.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No matches.</div>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
