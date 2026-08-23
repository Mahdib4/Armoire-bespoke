// Bespoke option behaviour
// ---------------------------------------------------------------------------
// Some style options are a single choice (one lapel), others let the customer
// pick several (e.g. Vent Style). Which is which is set per option in
// Admin → Bespoke Options and stored in Site Settings, so no database
// migration is needed.
//
// Multi-select values are stored in the order's selections map as a single
// comma-separated string, so carts, emails, the admin order view and the order
// API keep working unchanged.

/** Settings key marking a bespoke option group as multi-select. */
export function optionMultiKey(groupId: string): string {
  return `optionMulti:${groupId}`;
}

export function isOptionMulti(
  settings: Record<string, string>,
  groupId: string
): boolean {
  return settings[optionMultiKey(groupId)] === "1";
}

export const CHOICE_SEPARATOR = ", ";

/** "Single, Double" → ["Single", "Double"] */
export function splitChoices(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** ["Single", "Double"] → "Single, Double" */
export function joinChoices(choices: string[]): string {
  return choices.join(CHOICE_SEPARATOR);
}

// ---------------------------------------------------------------------------
// Per-product option layout
// ---------------------------------------------------------------------------
// Which bespoke blocks a product shows, in which order, and which are hidden
// for now. Kept in Site Settings so hiding an option keeps its position and no
// database migration is needed. The Fabric block takes part in the ordering
// under a reserved id.

/** Reserved layout id for the automatic Fabric block. */
export const FABRIC_BLOCK = "__fabric__";

export type OptionLayoutItem = { id: string; on: boolean };

export function optionLayoutKey(productId: string): string {
  return `optionLayout:${productId}`;
}

export function parseOptionLayout(value: string | undefined | null): OptionLayoutItem[] {
  if (!value) return [];
  try {
    const raw = JSON.parse(value);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((r) => r && typeof r.id === "string" && r.id)
      .map((r) => ({ id: r.id as string, on: r.on !== false }));
  } catch {
    return [];
  }
}

export function serializeOptionLayout(items: OptionLayoutItem[]): string {
  return JSON.stringify(items.map((i) => ({ id: i.id, on: i.on })));
}
