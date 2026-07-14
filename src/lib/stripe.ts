import Stripe from "stripe";

// Null when unconfigured — callers degrade gracefully. No pinned apiVersion
// (use the account default) to avoid version-mismatch checkout failures.
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
