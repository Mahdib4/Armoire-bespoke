/** Build a wa.me deep-link. Strips non-digits from the phone (wa.me needs the
 *  country code, no "+"/spaces). Optional pre-filled message text. */
export function waLink(phone: string | null | undefined, text?: string): string {
  const digits = (phone || "").replace(/[^\d]/g, "");
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${q}`;
}
