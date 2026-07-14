import Link from "next/link";
import {
  ArrowRight,
  LayoutGrid,
  Sparkles,
  Wand2,
  Package,
  Search,
  BadgeDollarSign,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/brand-mark";

const steps = [
  {
    icon: LayoutGrid,
    title: "Build the binder",
    body: "Drag cards into 9-pocket pages, pick a backdrop, and lay out the collection exactly how you want it.",
  },
  {
    icon: BadgeDollarSign,
    title: "See what it's worth",
    body: "Every card is priced from live market data. Mark what you own and what you still need in a click.",
  },
  {
    icon: Package,
    title: "We source & ship",
    body: "Order the missing cards and we'll hunt them down, assemble the finished binder, and mail it to you.",
  },
];

const features = [
  { icon: Search, title: "Live market pricing", body: "Cardmarket & TCGplayer values in multiple currencies, refreshed daily." },
  { icon: Wand2, title: "AI binder assembly", body: "Describe a binder in plain words — the AI drafts a full page you can edit." },
  { icon: Sparkles, title: "Community showcases", body: "Publish your best binders and browse what other collectors have built." },
  { icon: Package, title: "Physical fulfillment", body: "We source the singles and ship a real, finished binder to your door." },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0" />
        <div className="aurora left-[10%] top-[-6%] h-72 w-72" style={{ background: "oklch(0.68 0.2 293)" }} />
        <div className="aurora right-[6%] top-[10%] h-80 w-80" style={{ background: "oklch(0.72 0.16 200)" }} />

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 md:pt-28">
          <Badge variant="outline" className="mb-6 gap-1.5 border-primary/30 bg-primary/5 text-primary">
            <Sparkles className="size-3.5" /> Build it digital. Get it real.
          </Badge>
          <h1 className="max-w-3xl text-balance text-5xl leading-[1.03] md:text-7xl">
            Design the perfect <span className="holo-text">Pokémon binder</span>. We source the rest.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Lay out your dream binder card by card, price it in real time, and let us track down the
            missing singles and ship the finished thing to your door.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link href="/signup">
                Start building — free <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/explore">Explore binders</Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="size-4 text-accent" /> Free digital builder</span>
            <span className="flex items-center gap-1.5"><Check className="size-4 text-accent" /> Live pricing</span>
            <span className="flex items-center gap-1.5"><Check className="size-4 text-accent" /> Optional physical build</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <h2 className="text-center text-3xl md:text-4xl">How it works</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <Card key={s.title} className="relative overflow-hidden p-6">
              <span className="pointer-events-none absolute -right-2 -top-3 font-display text-7xl font-bold text-primary/10">
                {i + 1}
              </span>
              <div className="grid size-11 place-items-center rounded-xl bg-primary/12 text-primary">
                <s.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title} className="glass p-5">
              <f.icon className="size-5 text-accent" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-20">
        <h2 className="text-center text-3xl md:text-4xl">Simple pricing</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Start free. Upgrade when you want the AI, showcases, and a binder built for real.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card className="p-7">
            <h3 className="font-display text-xl font-bold">Free</h3>
            <div className="mt-3 text-4xl font-bold">€0</div>
            <ul className="mt-6 space-y-2.5 text-sm">
              {["Unlimited private binders", "Drag-and-drop builder", "Live card pricing", "Card search across sets"].map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-accent" /> {p}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-7 w-full" size="lg">
              <Link href="/signup">Get started</Link>
            </Button>
          </Card>

          <Card className="glow-primary relative border-primary/40 p-7">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most popular</Badge>
            <h3 className="font-display text-xl font-bold">Collector</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-bold">€9</span>
              <span className="text-muted-foreground">/mo</span>
            </div>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                "Everything in Free",
                "AI binder assembly",
                "Public community showcases",
                "Custom backdrop uploads",
                "Physical build & shipping",
              ].map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-primary" /> {p}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-7 w-full" size="lg">
              <Link href="/signup">Start building</Link>
            </Button>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-4">
        <Card className="glass relative overflow-hidden p-10 text-center md:p-14">
          <div className="aurora left-1/2 top-0 h-56 w-56 -translate-x-1/2" style={{ background: "oklch(0.68 0.2 293)" }} />
          <div className="relative flex justify-center">
            <BrandMark className="size-12" />
          </div>
          <h2 className="relative mt-5 text-3xl md:text-4xl">Your dream binder is a few drags away.</h2>
          <div className="relative mt-7 flex justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link href="/signup">
                Start building — free <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
