// Fulfillment quoting + state-machine metadata. Pure — safe in client and server.

export const SERVICE_RATE = 0.15; // service fee as a share of the cards subtotal
export const SERVICE_MIN = 5; // minimum service fee (EUR)
export const SHIPPING_FLAT = 6; // flat shipping estimate (EUR)

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function quote(cardsTotal: number) {
  const cards = round2(cardsTotal);
  const serviceFee = round2(Math.max(cards * SERVICE_RATE, SERVICE_MIN));
  const shippingFee = SHIPPING_FLAT;
  return { cardsTotal: cards, serviceFee, shippingFee, total: round2(cards + serviceFee + shippingFee) };
}

export const FULFILLMENT_STATES = [
  "REQUESTED",
  "QUOTED",
  "PAID",
  "SOURCING",
  "PARTIALLY_SOURCED",
  "SOURCED",
  "ASSEMBLING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;
export type FulfillmentState = (typeof FULFILLMENT_STATES)[number];

export const STATE_LABEL: Record<FulfillmentState, string> = {
  REQUESTED: "Requested",
  QUOTED: "Quoted",
  PAID: "Paid",
  SOURCING: "Sourcing",
  PARTIALLY_SOURCED: "Partially sourced",
  SOURCED: "Sourced",
  ASSEMBLING: "Assembling",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

// Suggested next transitions for the ops console.
export const NEXT_STATES: Record<FulfillmentState, FulfillmentState[]> = {
  REQUESTED: ["SOURCING", "CANCELLED"],
  QUOTED: ["PAID", "CANCELLED"],
  PAID: ["SOURCING", "CANCELLED"],
  SOURCING: ["SOURCED", "PARTIALLY_SOURCED", "CANCELLED"],
  PARTIALLY_SOURCED: ["ASSEMBLING", "SOURCED", "REFUNDED", "CANCELLED"],
  SOURCED: ["ASSEMBLING", "CANCELLED"],
  ASSEMBLING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

// Customer-facing progress track (terminal states handled separately).
export const PROGRESS_STEPS: FulfillmentState[] = [
  "REQUESTED",
  "SOURCING",
  "SOURCED",
  "ASSEMBLING",
  "SHIPPED",
  "DELIVERED",
];

/** Build a Cardmarket search URL to help ops source a card by name. */
export function cardmarketSearch(name: string): string {
  return `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${encodeURIComponent(name)}`;
}
