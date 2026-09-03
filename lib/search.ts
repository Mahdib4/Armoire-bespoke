// Catalogue matching
// ---------------------------------------------------------------------------
// Scoring shared by the search overlay and the search page. Runs in the
// browser against the downloaded index, so a suggestion appears the instant a
// key is pressed.
//
// The ranking is deliberately simple and predictable: a name that starts with
// what you typed beats a name that merely contains it, which beats a match on
// the collection or the description. Every typed word has to match something,
// so "black blazer" doesn't return every blazer.

export type SearchItem = {
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  sub: string;
  type: string;
  priceTk: number;
  wasTk: number;
  badge: string;
  image: string;
  terms: string;
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Score one product against one typed word. 0 = no match. */
function wordScore(item: SearchItem, word: string): number {
  const name = norm(item.name);
  if (name.startsWith(word)) return 100;
  // A word inside the name ("linen" in "Summer Linen Blazer").
  if (new RegExp(`\\b${escapeRe(word)}`).test(name)) return 70;
  if (name.includes(word)) return 45;

  const sub = norm(item.sub);
  if (sub && sub.startsWith(word)) return 40;
  if (sub && sub.includes(word)) return 30;

  const cat = norm(item.category);
  if (cat.startsWith(word)) return 35;
  if (cat.includes(word)) return 25;

  if (norm(item.terms).includes(word)) return 12;

  // Ready-Made / Tailor-Made and "sale" are useful things to type.
  if ("ready-made readymade ready".includes(word) && item.type === "READYMADE") return 15;
  if ("tailor-made tailormade bespoke made-to-measure custom".includes(word) && item.type === "CUSTOM")
    return 15;
  if ("sale discount offer".includes(word) && item.badge) return 15;

  return 0;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Rank the catalogue for a query. Every word must match something. */
export function searchCatalogue(items: SearchItem[], query: string, limit = 8): SearchItem[] {
  const q = norm(query);
  if (!q) return [];
  const words = q.split(" ").filter(Boolean);

  const scored: { item: SearchItem; score: number }[] = [];
  for (const item of items) {
    let total = 0;
    let matchedAll = true;
    for (const w of words) {
      const s = wordScore(item, w);
      if (s === 0) {
        matchedAll = false;
        break;
      }
      total += s;
    }
    if (!matchedAll) continue;
    // A whole-phrase hit on the name outranks the sum of its parts.
    if (norm(item.name).includes(q)) total += 60;
    if (item.badge) total += 4; // nudge discounted pieces up
    scored.push({ item, score: total });
  }

  scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
  return scored.slice(0, limit).map((s) => s.item);
}

/** The filter/sort choices offered on collection pages and search results. */
export type SortKey = "featured" | "price-asc" | "price-desc" | "name" | "new";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Name: A–Z" },
  { value: "new", label: "Newest First" },
];

export function sortProducts<T extends { name: string; priceTk: number; order?: number; createdAt?: string }>(
  items: T[],
  key: SortKey
): T[] {
  const out = [...items];
  switch (key) {
    case "price-asc":
      return out.sort((a, b) => a.priceTk - b.priceTk);
    case "price-desc":
      return out.sort((a, b) => b.priceTk - a.priceTk);
    case "name":
      return out.sort((a, b) => a.name.localeCompare(b.name));
    case "new":
      return out.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    default:
      // "Featured" is the order the admin arranged in the panel.
      return out.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
}
