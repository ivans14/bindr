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
  sets: { id: string; name: string; language: string }[];
  onChange: (next: CardFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<CardFilters>) => onChange({ ...value, ...patch });
  const active = hasActiveFilters({ ...value, query: undefined }); // ignore text query here
  const lang = value.language ?? DEFAULT_LANGUAGE;
  const langSets = sets.filter((s) => s.language === lang);

  return (
    <div className="rounded-lg border border-border bg-background/40">
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
        <div className="space-y-3 border-t border-border px-3 py-3">
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
                  className={cn(
                    chip,
                    on
                      ? "border-transparent text-white"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
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
                  ? "holo-text border-transparent bg-white/5"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              ✦ Full art
            </button>
          </div>

          <div className="grid gap-2">
            <SetCombobox
              sets={langSets}
              value={value.setId}
              onChange={(id) => set({ setId: id })}
            />
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

function SetCombobox({
  sets,
  value,
  onChange,
}: {
  sets: { id: string; name: string }[];
  value?: string;
  onChange: (id: string | undefined) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const selected = sets.find((s) => s.id === value);
  const filtered = (q ? sets.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())) : sets).slice(0, 60);

  return (
    <div className="relative">
      <input
        value={open ? q : (selected?.name ?? "")}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQ("");
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="All sets"
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
            All sets
          </button>
          {filtered.map((s) => (
            <button
              key={s.id}
              onMouseDown={() => {
                onChange(s.id);
                setOpen(false);
              }}
              className={cn(
                "block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-muted",
                s.id === value && "text-primary",
              )}
            >
              {s.name}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No sets match.</div>
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
