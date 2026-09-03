// Campaign discounts
// ---------------------------------------------------------------------------
// A campaign holds a curated set of products from any collection and, usually,
// a discount. The discount can be set once for the whole campaign and
// overridden on an individual product.
//
// Prices are ALWAYS recomputed from these helpers on the server when an order
// is placed — the browser's numbers are only ever a preview.
//
// Free of server-only imports so client components (product panel, cards) and
// server code (pages, order API) share exactly one implementation.

export type DiscountType = "none" | "percent" | "fixed";

export function isDiscountType(v: unknown): v is DiscountType {
  return v === "none" || v === "percent" || v === "fixed";
}

/** A live discount attached to a product, ready to show and to price with. */
export type ProductDiscount = {
  type: DiscountType;
  value: number;
  /** Corner label, e.g. "20% OFF". */
  label: string;
  /** Whether the admin wants the corner label on this product's card. */
  showBadge: boolean;
  campaignSlug: string;
  campaignName: string;
};

/** The price after a discount, floored at 0 and rounded to whole Taka. */
export function discountedPrice(price: number, d?: ProductDiscount | null): number {
  if (!d || d.type === "none" || d.value <= 0 || price <= 0) return price;
  const off = d.type === "percent" ? (price * d.value) / 100 : d.value;
  return Math.max(0, Math.round(price - off));
}

/** How much is taken off (0 when nothing applies). */
export function discountAmount(price: number, d?: ProductDiscount | null): number {
  return price - discountedPrice(price, d);
}

/** The default corner label for a discount, used when the admin leaves the
 *  label blank: "20% OFF" / "Tk 500 OFF". */
export function defaultBadgeText(type: DiscountType, value: number, currency = "Tk"): string {
  if (type === "percent" && value > 0) return `${value}% OFF`;
  if (type === "fixed" && value > 0) return `${currency} ${value} OFF`;
  return "";
}

/** Is this campaign running right now? Scheduling is optional: a blank start
 *  means "already running", a blank end means "until switched off". */
export function isCampaignLive(
  c: { active: boolean; startsAt?: Date | string | null; endsAt?: Date | string | null },
  now: Date = new Date()
): boolean {
  if (!c.active) return false;
  const t = now.getTime();
  if (c.startsAt && new Date(c.startsAt).getTime() > t) return false;
  if (c.endsAt && new Date(c.endsAt).getTime() < t) return false;
  return true;
}

/** Why a campaign isn't showing — for the admin list. */
export function campaignState(c: {
  active: boolean;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
}): "live" | "scheduled" | "ended" | "off" {
  if (!c.active) return "off";
  const t = Date.now();
  if (c.startsAt && new Date(c.startsAt).getTime() > t) return "scheduled";
  if (c.endsAt && new Date(c.endsAt).getTime() < t) return "ended";
  return "live";
}
