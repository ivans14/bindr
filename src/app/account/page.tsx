import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { requireUser, isPaid } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UpgradeButton, ManageButton } from "@/components/billing-buttons";

export const metadata = { title: "Account — bindr" };

const COLLECTOR_PERKS = [
  "AI binder assembly",
  "Public community showcases",
  "Custom image uploads",
  "Physical build & shipping",
];

export default async function AccountPage() {
  const user = (await requireUser()) as {
    name?: string;
    email: string;
    tier?: string;
    role?: string;
  };
  const paid = isPaid(user);
  const isAdminComp = user.tier !== "PAID" && user.role === "ADMIN";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl">Account</h1>
      <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>

      <Card className="mt-8 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Plan</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-display text-2xl font-bold">
                {paid ? "Collector" : "Free"}
              </span>
              {paid && <Badge className="gap-1"><Sparkles className="size-3" /> active</Badge>}
              {isAdminComp && <Badge variant="muted">admin — full access</Badge>}
            </div>
          </div>
        </div>

        {paid ? (
          <div className="mt-6">
            {isAdminComp ? (
              <p className="text-sm text-muted-foreground">
                You have full access as an admin. Manage billing appears once you subscribe.
              </p>
            ) : (
              <ManageButton />
            )}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="font-semibold">Upgrade to Collector — €9/mo</div>
            <ul className="mt-3 space-y-1.5 text-sm">
              {COLLECTOR_PERKS.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-primary" /> {p}
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <UpgradeButton />
            </div>
          </div>
        )}
      </Card>

      <div className="mt-6 flex gap-3 text-sm">
        <Link href="/binders" className="text-primary hover:underline">
          My binders
        </Link>
        <Link href="/orders" className="text-primary hover:underline">
          My orders
        </Link>
      </div>
    </div>
  );
}
