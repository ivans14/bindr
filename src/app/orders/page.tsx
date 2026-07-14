import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEur } from "@/lib/format";
import { STATE_LABEL, type FulfillmentState } from "@/lib/fulfillment";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "My orders — bindr" };

export default async function OrdersPage() {
  const user = await requireUser();
  const orders = await prisma.fulfillmentOrder.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { binder: { select: { title: true } }, _count: { select: { items: true } } },
  });

  const fmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl">My orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">Physical build requests and their status.</p>

      {orders.length === 0 ? (
        <Card className="mt-10 flex flex-col items-center gap-3 p-14 text-center">
          <PackageOpen className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            No build requests yet. Open a binder and hit “Request build”.
          </p>
        </Card>
      ) : (
        <div className="mt-8 space-y-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`}>
              <Card className="flex items-center justify-between p-4 transition-colors hover:border-primary/50">
                <div>
                  <div className="font-medium">{o.binder.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {o._count.items} card{o._count.items === 1 ? "" : "s"} · {fmt.format(o.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">
                    {o.quotedTotal ? formatEur(Number(o.quotedTotal)) : "—"}
                  </span>
                  <Badge variant="muted">{STATE_LABEL[o.state as FulfillmentState]}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
