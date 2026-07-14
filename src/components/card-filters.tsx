"use client";

import { useState } from "react";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import {
  type CardFilters,
  SUPERTYPES,
  POKEMON_TYPES,
  SUBTYPES,
  TYPE_COLOR,
  hasActiveFilters,
} from "@/lib/card-query";
import { cn } from "@/lib/utils";

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
  onChange,
}: {
  value: CardFilters;
  sets: { id: string; name: string }[];
  onChange: (next: CardFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<CardFilters>) => onChange({ ...value, ...patch });
  const active = hasActiveFilters({ ...value, query: undefined }); // ignore text query here

  return (
    <div className="rounded-lg border border-border bg-background/40">
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
            onClick={() =>
              onChange({ query: value.query }) /* keep text, clear structured filters */
            }
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" /> Clear
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-3 border-t border-border px-3 py-3">
          {/* Category */}
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

          {/* Pokémon type */}
          <Group label="Type">
            {POKEMON_TYPES.map((t) => {
              const on = value.types?.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => set({ types: toggle(value.types, t) })}
                  className={cn(chip, on ? "border-transparent text-white" : "border-border text-muted-foreground hover:text-foreground")}
                  style={on ? { background: TYPE_COLOR[t] } : undefined}
                >
                  <span
                    className="mr-1 inline-block size-2 rounded-full align-middle"
                    style={{ background: TYPE_COLOR[t] }}
                  />
                  {t}
                </button>
              );
            })}
          </Group>

          {/* Card type / subtype */}
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

          {/* Full art + set + artist */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => set({ fullArt: value.fullArt ? undefined : true })}
              className={cn(
                chip,
                value.fullArt
                  ? "holo-text border-transparent bg-white/5"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              ✦ Full art
            </button>
          </div>

          <div className="grid gap-2">
            <select
              value={value.setId ?? ""}
              onChange={(e) => set({ setId: e.target.value || undefined })}
              className="h-9 w-full rounded-lg border border-input bg-background/60 px-2 text-sm"
            >
              <option value="">All sets</option>
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              value={value.artist ?? ""}
              onChange={(e) => set({ artist: e.target.value || undefined })}
              placeholder="Artist…"
              className="h-9 w-full rounded-lg border border-input bg-background/60 px-3 text-sm placeholder:text-muted-foreground"
            />
          </div>
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
