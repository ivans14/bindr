"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingBag } from "lucide-react";
import { requestFulfillment } from "@/app/actions/fulfillment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RequestForm({ binderId, defaultName }: { binderId: string; defaultName?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await requestFulfillment({
      binderId,
      shipName: String(f.get("shipName") ?? ""),
      shipLine1: String(f.get("shipLine1") ?? ""),
      shipLine2: String(f.get("shipLine2") ?? ""),
      shipCity: String(f.get("shipCity") ?? ""),
      shipPostal: String(f.get("shipPostal") ?? ""),
      shipCountry: String(f.get("shipCountry") ?? ""),
    });
    if ("error" in res && res.error) {
      setError(res.error);
      setBusy(false);
      return;
    }
    if ("orderId" in res) {
      router.push(`/orders/${res.orderId}`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="shipName">Full name</Label>
        <Input id="shipName" name="shipName" defaultValue={defaultName} required autoComplete="name" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="shipLine1">Address</Label>
        <Input id="shipLine1" name="shipLine1" required autoComplete="address-line1" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="shipLine2">Address line 2 (optional)</Label>
        <Input id="shipLine2" name="shipLine2" autoComplete="address-line2" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="shipPostal">Postal code</Label>
          <Input id="shipPostal" name="shipPostal" required autoComplete="postal-code" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shipCity">City</Label>
          <Input id="shipCity" name="shipCity" required autoComplete="address-level2" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="shipCountry">Country</Label>
        <Input id="shipCountry" name="shipCountry" required defaultValue="Denmark" autoComplete="country-name" />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" className="w-full gap-2" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <ShoppingBag className="size-4" />}
        Confirm request
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        No charge yet — we confirm the final sourced price before any payment.
      </p>
    </form>
  );
}
