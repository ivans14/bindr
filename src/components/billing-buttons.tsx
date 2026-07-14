"use client";

import { useState } from "react";
import { Loader2, Sparkles, CreditCard } from "lucide-react";
import { startSubscription, openBillingPortal } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";

export function UpgradeButton({
  label = "Upgrade to Collector — €9/mo",
  size = "lg",
  className,
}: {
  label?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setError(null);
    const res = await startSubscription();
    if ("url" in res && res.url) {
      window.location.href = res.url;
      return;
    }
    setError(("error" in res && res.error) || "Couldn't start checkout.");
    setBusy(false);
  }
  return (
    <div>
      <Button size={size} className={`gap-2 ${className ?? ""}`} onClick={go} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {label}
      </Button>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ManageButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setError(null);
    const res = await openBillingPortal();
    if ("url" in res && res.url) {
      window.location.href = res.url;
      return;
    }
    setError(("error" in res && res.error) || "Couldn't open billing.");
    setBusy(false);
  }
  return (
    <div>
      <Button variant="outline" className="gap-2" onClick={go} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
        Manage subscription
      </Button>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
