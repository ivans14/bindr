import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Truck, XCircle } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEur } from "@/lib/format";
import { STATE_LABEL, PROGRESS_STEPS, type FulfillmentState } from "@/lib/fulfillment";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardImage } from "@/components/card-image";
import { PayButton } from "@/components/pay-button";
import { cn } from "@/lib/utils";

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const order = await prisma.fulfillmentOrder.findUnique({
    where: { id },
    include: { binder: { select: { title: true } }, items: { orderBy: { name: "asc" } } },
  });
  if (!order || order.userId !== user.id) notFound();

  const state = order.state as FulfillmentState;
  const terminal = state === "CANCELLED" || state === "REFUNDED";
  const currentStep = PROGRESS_STEPS.indexOf(state === "PARTIALLY_SOURCED" ? "SOURCED" : state);
  const paid = Boolean(order.paidAt);
  const payable = !paid && !terminal && (state === "REQUESTED" || state === "QUOTED");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/orders"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All orders
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">{order.binder.title}</h1>
        <Badge variant={terminal ? "muted" : "default"}>{STATE_LABEL[state]}</Badge>
      </div>

      {/* Progress track */}
      {terminal ? (
        <Card className="mt-6 flex items-center gap-3 p-5 text-muted-foreground">
          <XCircle className="size-5" /> This order was {STATE_LABEL[state].toLowerCase()}.
        </Card>
      ) : (
        <Card className="mt-6 p-6">
          <ol className="flex items-center justify-between">
            {PROGRESS_STEPS.map((step, i) => {
              const done = i <= currentStep;
              return (
                <li key={step} className="flex flex-1 flex-col items-center text-center">
                  <div
                    className={cn(
                      "grid size-8 place-items-center rounded-full border text-xs",
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-4" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      "mt-1.5 text-[10px] uppercase tracking-wide",
                      done ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {STATE_LABEL[step]}
                  </span>
                </li>
              );
            })}
          </ol>
          {state === "PARTIALLY_SOURCED" && (
            <p className="mt-4 text-center text-xs text-accent">
              Some cards couldn&apos;t be sourced — we&apos;ll be in touch about the difference.
            </p>
          )}
        </Card>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Quote
          </h2>
          <dl className="space-y-1.5 text-sm">
            <Row label="Cards" value={formatEur(Number(order.cardsTotal ?? 0))} />
            <Row label="Service fee" value={formatEur(Number(order.serviceFee ?? 0))} />
            <Row label="Shipping" value={formatEur(Number(order.shippingFee ?? 0))} />
            <div className="my-1.5 border-t border-border" />
            <Row label="Total" value={formatEur(Number(order.quotedTotal ?? 0))} strong />
          </dl>
          {paid ? (
            <div className="mt-3 flex items-center gap-1.5 text-sm text-accent">
              <Check className="size-4" /> Paid
            </div>
          ) : payable ? (
            <div className="mt-4">
              <PayButton orderId={order.id} amount={formatEur(Number(order.quotedTotal ?? 0))} />
            </div>
          ) : null}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Shipping to
          </h2>
          <address className="text-sm not-italic leading-relaxed text-muted-foreground">
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
          </address>
          {order.trackingCode && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Truck className="size-4 text-accent" />
              <span className="text-muted-foreground">
                {order.carrier ? `${order.carrier}: ` : ""}
                <span className="font-medium text-foreground">{order.trackingCode}</span>
              </span>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {order.items.length} card{order.items.length === 1 ? "" : "s"}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center gap-2.5">
              <CardImage
                card={{ name: it.name, number: it.number, setName: it.setName, imageBase: it.imageBase }}
                variant="thumb"
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{it.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {it.setName} · #{it.number}
                </div>
              </div>
              {it.sourced && <Check className="size-4 shrink-0 text-accent" />}
            </li>
          ))}
        </ul>
      </Card>
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
