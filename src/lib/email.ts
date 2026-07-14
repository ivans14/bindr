import { Resend } from "resend";
import { formatEur } from "./format";

// Null when unconfigured — deliver() falls back to a dev console log.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || "bindr <onboarding@resend.dev>";
const APP = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** Send an email; hardened so a mail failure never breaks the calling action. */
export async function deliver(to: string, subject: string, html: string) {
  if (!resend) {
    console.log(`[email dev] → ${to} · "${subject}" (set RESEND_API_KEY to actually send)`);
    return;
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) console.error("[email] send error:", error);
  } catch (err) {
    console.error("[email] threw:", err);
  }
}

function wrap(heading: string, body: string, cta?: { href: string; label: string }) {
  return `
  <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a2e">
    <div style="font-weight:700;font-size:20px;letter-spacing:-0.02em">bindr</div>
    <h1 style="font-size:22px;margin:16px 0 8px">${heading}</h1>
    <div style="font-size:14px;line-height:1.6;color:#444">${body}</div>
    ${
      cta
        ? `<a href="${cta.href}" style="display:inline-block;margin-top:20px;background:#7c5cff;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600;font-size:14px">${cta.label}</a>`
        : ""
    }
    <div style="margin-top:28px;font-size:12px;color:#999">bindr — build your Pokémon binder, we source the rest.</div>
  </div>`;
}

export function emailOrderRequested(
  to: string,
  o: { id: string; binderTitle: string; itemCount: number; total: number },
) {
  return deliver(
    to,
    `We got your build request — ${o.binderTitle}`,
    wrap(
      "Build request received",
      `Thanks! We'll source the <strong>${o.itemCount}</strong> card${o.itemCount === 1 ? "" : "s"} in
       “${o.binderTitle}”, assemble the binder, and ship it to you.<br/><br/>
       Estimated total: <strong>${formatEur(o.total)}</strong>. Card prices are daily estimates —
       we'll confirm the final price at sourcing before any charge.`,
      { href: `${APP}/orders/${o.id}`, label: "View order" },
    ),
  );
}

export function emailOrderPaid(
  to: string,
  o: { id: string; binderTitle: string; total: number },
) {
  return deliver(
    to,
    `Payment received — ${o.binderTitle}`,
    wrap(
      "Payment received",
      `We've received <strong>${formatEur(o.total)}</strong> for “${o.binderTitle}”. We're on it —
       you'll get another email when it ships.`,
      { href: `${APP}/orders/${o.id}`, label: "Track order" },
    ),
  );
}

export function emailOrderShipped(
  to: string,
  o: { id: string; binderTitle: string; carrier?: string | null; tracking?: string | null },
) {
  const track = o.tracking
    ? `Tracking: <strong>${o.carrier ? `${o.carrier} · ` : ""}${o.tracking}</strong>`
    : "";
  return deliver(
    to,
    `Your binder shipped — ${o.binderTitle}`,
    wrap(
      "Your binder is on its way",
      `“${o.binderTitle}” has shipped. ${track}`,
      { href: `${APP}/orders/${o.id}`, label: "View order" },
    ),
  );
}
