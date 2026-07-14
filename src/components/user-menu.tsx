"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    setBusy(true);
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <div className="text-sm font-medium leading-tight">{name || "Collector"}</div>
        <div className="text-xs text-muted-foreground">{email}</div>
      </div>
      <div className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
        <UserIcon className="size-4" />
      </div>
      <Button variant="ghost" size="icon" onClick={handleSignOut} disabled={busy} title="Sign out">
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}
