import Link from "next/link";
import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { UserMenu } from "@/components/user-menu";

export async function SiteHeader() {
  const session = await getSession();
  const user = session?.user;
  const isAdmin = (user as { role?: string } | undefined)?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark className="size-8" />
          <span className="font-display text-xl font-bold tracking-tight">bindr</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          <Link href="/explore" className="transition-colors hover:text-foreground">
            Explore
          </Link>
          <Link href="/#how" className="transition-colors hover:text-foreground">
            How it works
          </Link>
          <Link href="/#pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/binders">My binders</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/orders">Orders</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/account">Account</Link>
              </Button>
              {isAdmin && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/ops">Ops</Link>
                </Button>
              )}
              <UserMenu name={user.name ?? ""} email={user.email} />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Start building</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
