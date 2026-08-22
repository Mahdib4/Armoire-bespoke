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
