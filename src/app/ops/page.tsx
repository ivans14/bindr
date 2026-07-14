import { Truck } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Ops — bindr" };

export default async function OpsPage() {
  await requireAdmin();

  const orders = await prisma.fulfillmentOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      binder: { select: { title: true } },
      user: { select: { email: true, name: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center gap-2">
        <Truck className="size-6 text-accent" />
        <h1 className="text-3xl">Fulfillment ops</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Physical build requests. Sourcing workflow lands in a later milestone.
      </p>

      {orders.length === 0 ? (
        <Card className="mt-10 p-14 text-center text-muted-foreground">
          No fulfillment requests yet.
        </Card>
      ) : (
        <div className="mt-8 space-y-3">
          {orders.map((o) => (
            <Card key={o.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{o.binder.title}</div>
                <div className="text-sm text-muted-foreground">{o.user.email}</div>
              </div>
              <Badge variant="muted">{o.state.toLowerCase().replace(/_/g, " ")}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
