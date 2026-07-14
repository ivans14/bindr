import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEur } from "@/lib/format";
import { STATE_LABEL, type FulfillmentState } from "@/lib/fulfillment";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OpsControls } from "@/components/ops-controls";

export const metadata = { title: "Order — ops" };

export default async function OpsOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();

  const order = await prisma.fulfillmentOrder.findUnique({
    where: { id },
    include: {
      binder: { select: { id: true, title: true } },
      user: { select: { name: true, email: true } },
      items: { orderBy: { name: "asc" } },
    },
  });
  if (!order) notFound();

  const state = order.state as FulfillmentState;
  const fmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/ops"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All orders
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl">{order.binder.title}</h1>
        <Badge>{STATE_LABEL[state]}</Badge>
        <span className="text-sm text-muted-foreground">{fmt.format(order.createdAt)}</span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        {/* Summary */}
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Customer
            </h2>
            <div className="text-sm">
              <div className="font-medium">{order.user.name || "—"}</div>
              <div className="text-muted-foreground">{order.user.email}</div>
            </div>
            <div className="mt-3 border-t border-border pt-3 text-sm not-italic leading-relaxed text-muted-foreground">
              <span className="text-foreground">{order.shipName}</span>
              <br />
              {order.shipLine1}
              {order.shipLine2 && (
                <>
                  <br />
                  {order.shipLine2}
                </>
              )}
              <br />
              {order.shipPostal} {order.shipCity}
              <br />
              {order.shipCountry}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Quote
            </h2>
            <dl className="space-y-1.5 text-sm">
              <Row label="Cards" value={formatEur(Number(order.cardsTotal ?? 0))} />
              <Row label="Service fee" value={formatEur(Number(order.serviceFee ?? 0))} />
              <Row label="Shipping" value={formatEur(Number(order.shippingFee ?? 0))} />
              <div className="my-1.5 border-t border-border" />
              <Row label="Total" value={formatEur(Number(order.quotedTotal ?? 0))} strong />
            </dl>
          </Card>
        </div>

        {/* Controls */}
        <OpsControls
          orderId={order.id}
          state={state}
          items={order.items.map((i) => ({
            id: i.id,
            name: i.name,
            setName: i.setName,
            number: i.number,
            sourced: i.sourced,
          }))}
          carrier={order.carrier}
          trackingCode={order.trackingCode}
        />
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-display text-base font-bold" : "font-medium"}>{value}</dd>
    </div>
  );
}
