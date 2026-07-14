import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { latestEurPrices } from "@/lib/pricing";
import { BinderBuilder } from "@/components/binder-builder";
import { Badge } from "@/components/ui/badge";

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const binder = await prisma.binder.findUnique({
    where: { id },
    include: {
      slots: {
        orderBy: { position: "asc" },
        include: {
          card: {
            select: {
              id: true,
              name: true,
              number: true,
              setName: true,
              rarity: true,
              imageSmall: true,
            },
          },
        },
      },
    },
  });

  if (!binder || binder.ownerId !== user.id) notFound();

  const cardIds = binder.slots.map((s) => s.cardId).filter((v): v is string => Boolean(v));
  const prices = await latestEurPrices(cardIds);

  const initialSlots = binder.slots.map((s) => ({
    position: s.position,
    status: s.status,
    card: s.card,
    priceEur: s.cardId ? (prices.get(s.cardId) ?? null) : null,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href="/binders"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All binders
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">{binder.title}</h1>
        <Badge variant="muted">{binder.visibility.toLowerCase()}</Badge>
      </div>

      <BinderBuilder
        binderId={binder.id}
        pageCount={binder.pageCount}
        initialSlots={initialSlots}
      />
    </div>
  );
}
