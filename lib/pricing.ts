// Tailor-Made pricing model
// ---------------------------------------------------------------------------
// A tailor-made garment's price = tailoring charge + (fabric price per yard ×
// the yards that garment needs). Admins do NOT set a base price for tailor-made
// products; the price is derived entirely from the tailoring charge and the
// fabric chosen (fabric prices are set in the Fabric Collection section).
//
// The tailoring charge and the yards needed are both set per category from the
// admin panel (Categories & Banners) and stored in Site Settings, so no
// database migration is needed to change them.
//
// This module is intentionally free of server-only imports so it can be shared
// by client components (ProductPanel) and server code (pages, order API).

/** Fallback yards of fabric each garment needs, used until an admin sets a
 *  per-category value. Drives the fabric-cost portion of the price. */
export const GARMENT_YARDS: Record<string, number> = {
  blazer: 2.5,
  jacket: 2.5,
  trouser: 1.5,
  kurta: 2.75,
  shirt: 2.5,
};

/** Settings key holding how many yards of cloth a category's garment needs. */
export function fabricYardsKey(categorySlug: string): string {
  return `fabricYards:${categorySlug}`;
}

/** Yards this category's garment needs: the admin-set value if present, else
 *  the built-in default, else 0 (unknown → fabric cost omitted). */
export function garmentYards(
  categorySlug: string,
  settings?: Record<string, string>
): number {
  const v = Number(settings?.[fabricYardsKey(categorySlug)]);
  if (Number.isFinite(v) && v > 0) return v;
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
  yards: number,
  fabricPerYard: number
): number {
  return tailoringCharge + Math.round(fabricPerYard * yards);
}

/** "Starts from" = tailoring + the cheapest fabric × yards this garment needs. */
export function tailorFromPrice(
  tailoringCharge: number,
  yards: number,
  prices: Record<string, number>
): number {
  return tailorPrice(tailoringCharge, yards, minFabricPrice(prices));
}

/**
 * Price to show on a listing card: the "starts from" price for tailor-made,
 * the fixed price for ready-made.
 */
export function cardPrice(
  type: string,
  priceTk: number,
  tailoringCharge: number,
  yards: number,
  prices: Record<string, number>
): number {
  return type === "CUSTOM" ? tailorFromPrice(tailoringCharge, yards, prices) : priceTk;
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

/** Narrow a fabric price map to the fabrics a category actually offers.
 *  Fabrics are chosen per category in Admin → Bespoke Options; an empty
 *  allow-list means "no restriction" (every priced fabric is available). */
export function allowedFabricPrices(
  prices: Record<string, number>,
  allowed: string[] | null | undefined
): Record<string, number> {
  if (!allowed || allowed.length === 0) return prices;
  const out: Record<string, number> = {};
  for (const name of allowed) {
    if (prices[name] > 0) out[name] = prices[name];
  }
  // If the allow-list names nothing priced, fall back to the full map rather
  // than pricing the garment at fabric-cost zero.
  return Object.keys(out).length ? out : prices;
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

export type DeliveryZone = "inside-dhaka" | "outside-dhaka";

/** Default delivery charges (Tk); admins can override them in Site Settings. */
export const DELIVERY_DEFAULTS: Record<DeliveryZone, number> = {
  "inside-dhaka": 70,
  "outside-dhaka": 130,
};

export const DELIVERY_ZONES: { value: DeliveryZone; label: string }[] = [
  { value: "inside-dhaka", label: "Inside Dhaka" },
  { value: "outside-dhaka", label: "Outside Dhaka" },
];

/** Settings key holding a zone's delivery charge. */
export function deliveryChargeKey(zone: DeliveryZone): string {
  return zone === "inside-dhaka" ? "deliveryInsideTk" : "deliveryOutsideTk";
}

export function isDeliveryZone(v: unknown): v is DeliveryZone {
  return v === "inside-dhaka" || v === "outside-dhaka";
}

/** Delivery charge (Tk) for a zone — admin value if set, else the default. */
export function deliveryCharge(
  settings: Record<string, string>,
  zone: DeliveryZone | null | undefined
): number {
  if (!isDeliveryZone(zone)) return 0;
  const raw = settings[deliveryChargeKey(zone)];
  const v = Number(raw);
  // An explicit "0" is honoured (free delivery); blank/invalid falls back.
  if (raw !== undefined && raw !== "" && Number.isFinite(v) && v >= 0) return Math.round(v);
  return DELIVERY_DEFAULTS[zone];
}

export function deliveryZoneLabel(zone: string | null | undefined): string {
  return DELIVERY_ZONES.find((z) => z.value === zone)?.label ?? "";
}
