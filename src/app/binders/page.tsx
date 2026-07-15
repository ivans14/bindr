import Link from "next/link";
import { Plus, LayoutGrid, Lock, Globe, Link2 } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { latestEurPrices } from "@/lib/pricing";
import { formatEur } from "@/lib/format";
import { createBinder } from "@/app/actions/binders";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BinderCover } from "@/components/binder-cover";

const visIcon = { PRIVATE: Lock, UNLISTED: Link2, PUBLIC: Globe } as const;

export default async function BindersPage() {
  const user = await requireUser();

  const binders = await prisma.binder.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      slots: {
        where: { cardId: { not: null } },
        orderBy: { position: "asc" },
        select: {
          cardId: true,
          card: { select: { name: true, number: true, setName: true, imageBase: true } },
        },
      },
    },
  });

  const allCardIds = [...new Set(binders.flatMap((b) => b.slots.map((s) => s.cardId!)))];
  const prices = await latestEurPrices(allCardIds);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">My binders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {binders.length} binder{binders.length === 1 ? "" : "s"}
          </p>
        </div>
        <form action={createBinder} className="flex items-center gap-2">
          <Input name="title" placeholder="New binder name" className="w-52" />
          <Button type="submit" className="gap-1.5">
            <Plus className="size-4" /> Create
          </Button>
        </form>
      </div>

      {binders.length === 0 ? (
        <Card className="mt-10 flex flex-col items-center gap-3 p-14 text-center">
          <LayoutGrid className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">No binders yet — create your first one above.</p>
        </Card>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {binders.map((b) => {
            const value = b.slots.reduce((sum, s) => sum + (prices.get(s.cardId!) ?? 0), 0);
            const Vis = visIcon[b.visibility];
            return (
              <Link key={b.id} href={`/binders/${b.id}`}>
                <Card className="group h-full overflow-hidden p-5 transition-colors hover:border-primary/50">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold group-hover:text-primary">
                      {b.title}
                    </h3>
                    <Badge variant="muted" className="shrink-0">
                      <Vis className="size-3" /> {b.visibility.toLowerCase()}
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <BinderCover cards={b.slots.map((s) => s.card!).filter(Boolean)} />
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-bold">{formatEur(value)}</div>
                      <div className="text-xs text-muted-foreground">est. market value</div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {b.slots.length} card{b.slots.length === 1 ? "" : "s"}
                      <br />
                      {b.pageCount} page{b.pageCount === 1 ? "" : "s"}
                    </div>
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
