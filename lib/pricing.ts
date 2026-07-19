// Tailor-Made pricing model
// ---------------------------------------------------------------------------
// A tailor-made garment's price = tailoring charge + (fabric price per yard ×
// the yards that garment needs). Admins do NOT set a base price for tailor-made
// products; the price is derived entirely from the tailoring charge and the
// fabric chosen (fabric prices are set in the Fabric Collection section).
//
// This module is intentionally free of server-only imports so it can be shared
// by client components (ProductPanel) and server code (pages, order API).

/** Yards of fabric each garment needs. Drives the fabric-cost portion of price. */
export const GARMENT_YARDS: Record<string, number> = {
  blazer: 2.5,
  jacket: 2.5,
  trouser: 1.5,
  kurta: 2.75,
  shirt: 2.5,
};

/** Yards this category's garment needs (0 if unknown → fabric cost omitted). */
export function garmentYards(categorySlug: string): number {
  return GARMENT_YARDS[categorySlug] ?? 0;
}

/** Settings key holding a category's fixed tailoring charge. */
export function tailoringChargeKey(categorySlug: string): string {
  return `tailorCharge:${categorySlug}`;
}

/** A category's fixed tailoring charge (Tk), read from Site Settings. Admin-set
 *  per category; 0 if not configured. */
export function categoryTailoringCharge(
  settings: Record<string, string>,
  categorySlug: string
): number {
  const v = Number(settings[tailoringChargeKey(categorySlug)]);
  return Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
}

/** Cheapest priced fabric per yard across the given price map (0 if none). */
export function minFabricPrice(prices: Record<string, number>): number {
  const vals = Object.values(prices).filter((v) => v > 0);
  return vals.length ? Math.min(...vals) : 0;
}

/** Tailor-made price for a specific fabric = tailoring + perYard × yards. */
export function tailorPrice(
  tailoringCharge: number,
  categorySlug: string,
  fabricPerYard: number
): number {
  return tailoringCharge + Math.round(fabricPerYard * garmentYards(categorySlug));
}

/** "Starts from" = tailoring + the cheapest fabric × yards this garment needs. */
export function tailorFromPrice(
  tailoringCharge: number,
  categorySlug: string,
  prices: Record<string, number>
): number {
  return tailorPrice(tailoringCharge, categorySlug, minFabricPrice(prices));
}

/**
 * Price to show on a listing card: the "starts from" price for tailor-made,
 * the fixed price for ready-made.
 */
export function cardPrice(
  type: string,
  priceTk: number,
  tailoringCharge: number,
  categorySlug: string,
  prices: Record<string, number>
): number {
  return type === "CUSTOM" ? tailorFromPrice(tailoringCharge, categorySlug, prices) : priceTk;
}

/** Find the chosen fabric name inside a selections map (a value that is a
 *  priced fabric). Used server-side to re-price an order line. */
export function fabricFromSelections(
  selections: Record<string, string> | null | undefined,
  prices: Record<string, number>
): string | null {
  if (!selections) return null;
  for (const v of Object.values(selections)) {
    if (prices[v] > 0) return v;
  }
  return null;
}
