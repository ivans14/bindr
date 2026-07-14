import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { latestEurPrices } from "@/lib/pricing";
import { formatEur } from "@/lib/format";
import { quote } from "@/lib/fulfillment";
import { Card } from "@/components/ui/card";
import { CardImage } from "@/components/card-image";
import { RequestForm } from "@/components/request-form";

export default async function RequestBuildPage({
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
        where: { status: "WANTED", cardId: { not: null } },
        orderBy: { position: "asc" },
        include: {
          card: { select: { id: true, name: true, number: true, setName: true, imageBase: true } },
        },
      },
    },
  });
  if (!binder || binder.ownerId !== user.id) notFound();

  const wanted = binder.slots.filter((s) => s.card);
  if (wanted.length === 0) redirect(`/binders/${id}`);

  const prices = await latestEurPrices(wanted.map((s) => s.cardId!));
  const cardsTotal = wanted.reduce((sum, s) => sum + (prices.get(s.cardId!) ?? 0), 0);
  const q = quote(cardsTotal);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href={`/binders/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to builder
      </Link>
      <h1 className="text-3xl">Request a build</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        We&apos;ll source the {wanted.length} card{wanted.length === 1 ? "" : "s"} marked{" "}
        <span className="text-primary">to source</span> in “{binder.title}”, assemble the binder, and
        ship it to you.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.2fr_1fr]">
        {/* Shipping form */}
        <Card className="order-2 p-6 md:order-1">
          <h2 className="mb-4 text-lg font-semibold">Shipping address</h2>
          <RequestForm binderId={id} defaultName={user.name ?? ""} />
        </Card>

        {/* Quote summary */}
        <div className="order-1 space-y-4 md:order-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Estimated quote</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label={`Cards (${wanted.length})`} value={formatEur(q.cardsTotal)} />
              <Row label="Service fee" value={formatEur(q.serviceFee)} />
              <Row label="Shipping" value={formatEur(q.shippingFee)} />
              <div className="my-2 border-t border-border" />
              <Row label="Estimated total" value={formatEur(q.total)} strong />
            </dl>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Card prices are daily market estimates; the final total is confirmed at sourcing
              before any charge.
            </p>
          </Card>

          <Card className="max-h-80 overflow-y-auto p-4">
            <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              Cards to source
            </div>
            <ul className="space-y-2">
              {wanted.map((s) => (
                <li key={s.position} className="flex items-center gap-2.5">
                  <CardImage card={s.card!} variant="thumb" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.card!.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {s.card!.setName} · #{s.card!.number}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs font-semibold">
                    {prices.has(s.cardId!) ? formatEur(prices.get(s.cardId!)!) : "—"}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-display text-lg font-bold" : "font-medium"}>{value}</dd>
    </div>
  );
}
