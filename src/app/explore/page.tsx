import Link from "next/link";
import { Globe, LayoutGrid } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { latestEurPrices } from "@/lib/pricing";
import { formatEur } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Explore binders — bindr" };

export default async function ExplorePage() {
  const binders = await prisma.binder.findMany({
    where: { visibility: "PUBLIC" },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: {
      owner: { select: { name: true } },
      slots: { where: { cardId: { not: null } }, select: { cardId: true } },
    },
  });

  const cardIds = [...new Set(binders.flatMap((b) => b.slots.map((s) => s.cardId!)))];
  const prices = await latestEurPrices(cardIds);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex items-center gap-2">
        <Globe className="size-6 text-accent" />
        <h1 className="text-3xl">Community showcases</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Public binders built by the bindr community.
      </p>

      {binders.length === 0 ? (
        <Card className="mt-10 flex flex-col items-center gap-3 p-14 text-center">
          <LayoutGrid className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            No public binders yet. Make one of yours public to feature it here.
          </p>
        </Card>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {binders.map((b) => {
            const value = b.slots.reduce((sum, s) => sum + (prices.get(s.cardId!) ?? 0), 0);
            return (
              <Link key={b.id} href={`/b/${b.id}`}>
                <Card className="h-full p-5 transition-colors hover:border-primary/50">
                  <h3 className="font-display text-lg font-semibold">{b.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    by {b.owner.name || "a collector"}
                  </p>
                  <div className="mt-5 flex items-end justify-between">
                    <Badge variant="muted">{b.slots.length} cards</Badge>
                    <div className="text-lg font-bold">{formatEur(value)}</div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
