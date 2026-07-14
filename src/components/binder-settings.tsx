"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Pencil, Trash2, Loader2 } from "lucide-react";
import { updateBinderMeta, deleteBinder } from "@/app/actions/binders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const VIS = [
  { value: "PRIVATE", label: "Private" },
  { value: "UNLISTED", label: "Unlisted" },
  { value: "PUBLIC", label: "Public" },
] as const;

export function BinderSettings({
  binderId,
  title,
  visibility,
}: {
  binderId: string;
  title: string;
  visibility: "PRIVATE" | "UNLISTED" | "PUBLIC";
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
    if (name.trim() && name !== title) {
      start(async () => {
        await updateBinderMeta({ binderId, title: name.trim() });
        router.refresh();
      });
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
    <div className="flex flex-wrap items-center gap-2">
      {editing ? (
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => e.key === "Enter" && saveName()}
          className="h-8 w-56"
        />
      ) : (
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
          <Pencil className="size-3.5" /> Rename
        </Button>
      )}

      <select
        value={vis}
        onChange={(e) => changeVisibility(e.target.value as typeof vis)}
        className="h-8 rounded-lg border border-input bg-background/60 px-2 text-sm"
      >
        {VIS.map((v) => (
          <option key={v.value} value={v.value}>
            {v.label}
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
  );
}
