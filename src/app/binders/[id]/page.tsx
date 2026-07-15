import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser, isPaid } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { latestEurPrices } from "@/lib/pricing";
import { getCardFacets } from "@/app/actions/binders";
import { BinderBuilder } from "@/components/binder-builder";
import { BinderSettings } from "@/components/binder-settings";

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const paid = isPaid(user);

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
              imageBase: true,
            },
          },
        },
      },
    },
  });

  if (!binder || binder.ownerId !== user.id) notFound();

  const cardIds = binder.slots.map((s) => s.cardId).filter((v): v is string => Boolean(v));
  const [prices, facets] = await Promise.all([latestEurPrices(cardIds), getCardFacets()]);

  const initialSlots = binder.slots.map((s) => ({
    position: s.position,
    status: s.status,
    card: s.card,
    sleeve: s.sleeve,
    customImage: s.customImage,
    priceEur: s.cardId ? (prices.get(s.cardId) ?? null) : null,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link
        href="/binders"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All binders
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">{binder.title}</h1>
        <BinderSettings
          binderId={binder.id}
          title={binder.title}
          visibility={binder.visibility}
          isPaid={paid}
        />
      </div>

      <BinderBuilder
        binderId={binder.id}
        pageCount={binder.pageCount}
        initialSlots={initialSlots}
        sets={facets.sets}
        artists={facets.artists}
        theme={binder.theme}
        isPaid={paid}
      />
    </div>
  );
}
