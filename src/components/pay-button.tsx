"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { createCheckout } from "@/app/actions/fulfillment";
import { Button } from "@/components/ui/button";

export function PayButton({ orderId, amount }: { orderId: string; amount: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    const res = await createCheckout(orderId);
    if ("url" in res && res.url) {
      window.location.href = res.url;
      return;
    }
    setError(("error" in res && res.error) || "Couldn't start checkout.");
    setBusy(false);
  }

  return (
    <div>
      <Button onClick={pay} disabled={busy} size="lg" className="w-full gap-2">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
        Pay {amount}
      </Button>
      {error && <p className="mt-2 text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
