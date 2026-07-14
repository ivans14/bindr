import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Server-side gate: returns the current user or redirects to /login. */
export async function requireUser() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return session.user;
}

/** Collector-tier access. Admins always count as paid (for ops/testing). */
export function isPaid(user: { tier?: string | null; role?: string | null }): boolean {
  return user.tier === "PAID" || user.role === "ADMIN";
}

/** Server-side gate for /ops: user must have role ADMIN. */
export async function requireAdmin() {
  const session = await getSession();
  const user = session?.user as { role?: string } | undefined;
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
