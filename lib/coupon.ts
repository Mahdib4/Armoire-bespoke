// Coupon codes
// ---------------------------------------------------------------------------
// A code is checked twice: once when the customer applies it at checkout (so
// they see the discount straight away) and again on the server when the order
// is placed. Both use the single rule set below, so the preview can never
// disagree with what is actually charged.
//
// No server-only imports — shared by the checkout form and the order API.

export type CouponType = "percent" | "fixed";
/** Which lines a code may discount. */
export type CouponScope = "all" | "READYMADE" | "CUSTOM";

/** The rules of a code, as stored. */
export type CouponRules = {
  code: string;
  type: CouponType;
  value: number;
  minSubtotalTk: number;
  maxDiscountTk: number;
  appliesTo: CouponScope;
  /** Category ids the code is limited to; empty = every collection. */
  categoryIds: string[];
  /** Product ids the code is limited to; empty = not limited to particular pieces. */
  productIds: string[];
  startsAt: Date | string | null;
  expiresAt: Date | string | null;
  usageLimit: number;
  perEmailLimit: number;
  usedCount: number;
  active: boolean;
};

/** One cart line, reduced to what the rules care about. */
export type CouponLine = {
  type: string; // CUSTOM | READYMADE | FABRIC
  categoryId?: string | null;
  productId?: string | null;
  priceTk: number;
  qty: number;
};

export type CouponCheck =
  | { ok: true; discountTk: number; eligibleTk: number; message: string }
  | { ok: false; error: string };

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * The part of the order a code may discount.
 *
 * Collections and pieces widen each other rather than narrowing: a code set to
 * Blazer plus one particular shirt covers every blazer and that shirt. With
 * neither set, the code covers the whole catalogue.
 */
export function eligibleSubtotal(lines: CouponLine[], rules: CouponRules): number {
  const limited = rules.categoryIds.length > 0 || rules.productIds.length > 0;
  return lines.reduce((sum, l) => {
    // Fabric by the yard is sold at cost per yard and is never discounted.
    if (l.type === "FABRIC") return sum;
    if (rules.appliesTo !== "all" && l.type !== rules.appliesTo) return sum;
    if (limited) {
      const byCategory = !!l.categoryId && rules.categoryIds.includes(l.categoryId);
      const byProduct = !!l.productId && rules.productIds.includes(l.productId);
      if (!byCategory && !byProduct) return sum;
    }
    return sum + l.priceTk * l.qty;
  }, 0);
}

/**
 * Apply every rule to a cart. `subtotal` is the whole order (used for the
 * minimum-order test); the discount itself is taken off the eligible part only.
 */
export function checkCoupon(
  rules: CouponRules,
  lines: CouponLine[],
  subtotal: number,
  redeemedByEmail = 0,
  now: Date = new Date()
): CouponCheck {
  if (!rules.active) return { ok: false, error: "This code is no longer available." };

  const t = now.getTime();
  if (rules.startsAt && new Date(rules.startsAt).getTime() > t) {
    return { ok: false, error: "This code isn't active yet." };
  }
  if (rules.expiresAt && new Date(rules.expiresAt).getTime() < t) {
    return { ok: false, error: "This code has expired." };
  }
  if (rules.usageLimit > 0 && rules.usedCount >= rules.usageLimit) {
    return { ok: false, error: "This code has reached its usage limit." };
  }
  if (rules.perEmailLimit > 0 && redeemedByEmail >= rules.perEmailLimit) {
    return { ok: false, error: "You have already used this code." };
  }
  if (rules.minSubtotalTk > 0 && subtotal < rules.minSubtotalTk) {
    return {
      ok: false,
      error: `This code needs a minimum order of Tk ${rules.minSubtotalTk.toLocaleString("en-IN")}.`,
    };
  }

  const eligible = eligibleSubtotal(lines, rules);
  if (eligible <= 0) {
    return {
      ok: false,
      error:
        rules.productIds.length > 0 && rules.categoryIds.length === 0
          ? "This code applies to selected pieces only."
          : rules.appliesTo === "READYMADE"
            ? "This code applies to Ready-Made pieces only."
            : rules.appliesTo === "CUSTOM"
              ? "This code applies to Tailor-Made pieces only."
              : "This code doesn't apply to anything in your bag.",
    };
  }

  let discount =
    rules.type === "percent" ? Math.round((eligible * rules.value) / 100) : Math.round(rules.value);
  if (rules.type === "percent" && rules.maxDiscountTk > 0) {
    discount = Math.min(discount, rules.maxDiscountTk);
  }
  // Never discount more than the part of the order it applies to.
  discount = Math.max(0, Math.min(discount, eligible));
  if (discount <= 0) return { ok: false, error: "This code gives no discount on this order." };

  return {
    ok: true,
    discountTk: discount,
    eligibleTk: eligible,
    message:
      rules.type === "percent"
        ? `${rules.value}% off applied.`
        : `Tk ${rules.value.toLocaleString("en-IN")} off applied.`,
  };
}

/** A short human description of a code, for the admin list. */
export function describeCoupon(rules: Pick<CouponRules, "type" | "value" | "maxDiscountTk">): string {
  if (rules.type === "percent") {
    return rules.maxDiscountTk > 0
      ? `${rules.value}% off (max Tk ${rules.maxDiscountTk})`
      : `${rules.value}% off`;
  }
  return `Tk ${rules.value} off`;
}
