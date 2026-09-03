"use client";
import type { SearchItem } from "./search";

// The catalogue is downloaded once per visit and kept for the session, so the
// search box and the search page both match locally with nothing to wait for.

const CACHE_KEY = "ab_search_index_v1";
const CACHE_TTL = 5 * 60 * 1000;

export async function loadSearchIndex(): Promise<SearchItem[]> {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached && Date.now() - cached.at < CACHE_TTL && Array.isArray(cached.docs)) {
        return cached.docs as SearchItem[];
      }
    }
  } catch {
    // Private browsing can refuse storage — fall through and fetch.
  }

  const res = await fetch("/api/search");
  if (!res.ok) throw new Error("Search index unavailable");
  const data = await res.json();
  const docs: SearchItem[] = Array.isArray(data.docs) ? data.docs : [];
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), docs }));
  } catch {}
  return docs;
}
