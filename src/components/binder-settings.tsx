"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Pencil, Trash2, Loader2 } from "lucide-react";
import { updateBinderMeta, deleteBinder } from "@/app/actions/binders";
import { Button } from "@/components/ui/button";

const VIS = [
  { value: "PRIVATE", label: "Private" },
  { value: "UNLISTED", label: "Unlisted" },
  { value: "PUBLIC", label: "Public" },
] as const;

export function BinderSettings({
  binderId,
  title,
  visibility,
  isPaid,
}: {
  binderId: string;
  title: string;
  visibility: "PRIVATE" | "UNLISTED" | "PUBLIC";
  isPaid: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [vis, setVis] = useState(visibility);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(title);
  const [copied, setCopied] = useState(false);

  function changeVisibility(v: (typeof VIS)[number]["value"]) {
    setVis(v);
    start(async () => {
      await updateBinderMeta({ binderId, visibility: v });
      router.refresh();
    });
  }
  function saveName() {
    setEditing(false);
    const next = name.trim();
    if (next && next !== title) {
      start(async () => {
        await updateBinderMeta({ binderId, title: next });
        router.refresh();
      });
    } else {
      setName(title);
    }
  }
  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/b/${binderId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  function remove() {
    if (!confirm("Delete this binder? This can't be undone.")) return;
    start(async () => {
      await deleteBinder(binderId);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveName();
            if (e.key === "Escape") {
              setName(title);
              setEditing(false);
            }
          }}
          className="min-w-0 flex-1 border-b-2 border-primary bg-transparent font-display text-3xl font-bold outline-none"
        />
      ) : (
        <h1
          className="cursor-text font-display text-3xl font-bold"
          onDoubleClick={() => setEditing(true)}
          title="Double-click or use Rename to edit"
        >
          {title}
        </h1>
      )}

      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
          <Pencil className="size-3.5" /> Rename
        </Button>
        <select
          value={vis}
          onChange={(e) => changeVisibility(e.target.value as typeof vis)}
          title={isPaid ? undefined : "Public sharing is a Collector feature"}
          className="h-8 rounded-lg border border-input bg-background/60 px-2 text-sm"
        >
          {VIS.map((v) => (
            <option key={v.value} value={v.value} disabled={!isPaid && v.value !== "PRIVATE"}>
              {v.label}
              {!isPaid && v.value !== "PRIVATE" ? " (Collector)" : ""}
            </option>
          ))}
        </select>
        {vis !== "PRIVATE" && (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={copyLink}>
            {copied ? <Check className="size-3.5 text-accent" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-destructive"
          onClick={remove}
        >
          <Trash2 className="size-3.5" /> Delete
        </Button>
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
