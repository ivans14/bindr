"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { signOut } from "@/lib/auth-client";

export function UserMenu({
  name,
  email,
  isAdmin,
}: {
  name: string;
  email: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    setBusy(true);
    await signOut();
    router.push("/");
    router.refresh();
  }

  const links = [
    { href: "/binders", label: "My binders" },
    { href: "/orders", label: "Orders" },
    { href: "/account", label: "Account" },
    ...(isAdmin ? [{ href: "/ops", label: "Ops" }] : []),
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-transparent p-0.5 hover:border-border"
        aria-label="Account menu"
      >
        <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
          <UserIcon className="size-4" />
        </span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-popover p-1.5 shadow-xl">
            <div className="px-3 py-2">
              <div className="truncate text-sm font-medium">{name || "Collector"}</div>
              <div className="truncate text-xs text-muted-foreground">{email}</div>
            </div>
            <div className="my-1 border-t border-border" />
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}
            <div className="my-1 border-t border-border" />
            <button
              onClick={handleSignOut}
              disabled={busy}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
