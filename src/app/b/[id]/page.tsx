import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { latestEurPrices } from "@/lib/pricing";
import { formatEur } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

const SLOTS_PER_PAGE = 9;

export default async function PublicBinderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const binder = await prisma.binder.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true } },
      slots: {
        orderBy: { position: "asc" },
        include: { card: { select: { id: true, name: true, imageSmall: true } } },
      },
    },
  });

  if (!binder || binder.visibility === "PRIVATE") notFound();

  const cardIds = binder.slots.map((s) => s.cardId).filter((v): v is string => Boolean(v));
  const prices = await latestEurPrices(cardIds);
  const value = cardIds.reduce((sum, cid) => sum + (prices.get(cid) ?? 0), 0);

  const pages = Array.from({ length: binder.pageCount }, (_, p) =>
    binder.slots.filter((s) => Math.floor(s.position / SLOTS_PER_PAGE) === p),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">{binder.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">by {binder.owner.name || "a collector"}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{formatEur(value)}</div>
          <Badge variant="muted">{cardIds.length} cards</Badge>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {pages.map((pageSlots, p) => (
          <div key={p}>
            <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              Page {p + 1}
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border bg-card/40 p-4">
              {pageSlots.map((s) => (
                <div
                  key={s.position}
                  className="aspect-[63/88] overflow-hidden rounded-lg border border-border"
                >
                  {s.card?.imageSmall ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.card.imageSmall} alt={s.card.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="pocket-empty h-full w-full" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
