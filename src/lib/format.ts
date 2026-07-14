const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

export function formatEur(value: number): string {
  return eur.format(value);
}
