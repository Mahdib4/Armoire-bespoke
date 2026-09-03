"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatTk } from "@/lib/format";
import { searchCatalogue, type SearchItem } from "@/lib/search";
import { loadSearchIndex } from "@/lib/search-index";

/**
 * Search: the magnifier in the header and the panel it opens.
 *
 * The whole catalogue is downloaded once, on the first open, and every
 * keystroke is matched against it in the browser — so suggestions, with photos
 * and prices, appear from the very first character with nothing to wait for.
 *
 * The panel is portalled to <body>. It lives in the header, and once the page
 * is scrolled the header gets a backdrop-filter — which would make it the
 * containing block for the fixed overlay and squash the panel into the
 * header's own strip, clipped by its overflow.
 */
export default function SearchBox({ currency = "Tk" }: { currency?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [docs, setDocs] = useState<SearchItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // The catalogue is fetched the first time the panel is opened — one request
  // per visit, after which every keystroke is matched locally.
  const fetchIndex = useCallback(() => {
    if (docs || loading) return;
    setLoading(true);
    loadSearchIndex()
      .then((d) => {
        setDocs(d);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [docs, loading]);

  const openPanel = useCallback(() => {
    setOpen(true);
    fetchIndex();
  }, [fetchIndex]);

  // Open on click, and on the usual keyboard shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => {
          if (!o) fetchIndex();
          return !o;
        });
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fetchIndex]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, [open]);

  const results = useMemo(() => searchCatalogue(docs ?? [], q, 8), [docs, q]);

  // Typing always starts the highlight at the top result.
  const type = (value: string) => {
    setQ(value);
    setActive(0);
  };

  const go = (slug: string) => {
    setOpen(false);
    setQ("");
    router.push(`/p/${slug}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) go(results[active].slug);
      else if (q.trim()) {
        setOpen(false);
        router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }
    }
  };

  return (
    <>
      <button className="ab-search-btn" onClick={openPanel} aria-label="Search">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div className="srch" role="dialog" aria-modal="true" aria-label="Search products">
            <button className="srch-scrim" aria-label="Close search" onClick={() => setOpen(false)} />
            <div className="srch-panel">
              <div className="srch-bar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => type(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Search blazers, shirts, fabrics…"
                  aria-label="Search"
                  autoComplete="off"
                />
                {q && (
                  <button className="srch-clear" onClick={() => type("")} aria-label="Clear">
                    ✕
                  </button>
                )}
                <button className="srch-close" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>

              <div className="srch-results">
                {!q && (
                  <p className="srch-hint">
                    {loading ? "Preparing the catalogue…" : "Start typing — suggestions appear straight away."}
                  </p>
                )}
                {q && failed && <p className="srch-hint">Search is unavailable right now.</p>}
                {q && !failed && results.length === 0 && !loading && (
                  <p className="srch-hint">
                    Nothing matches &ldquo;{q}&rdquo;. Try a collection name, a fabric or a style.
                  </p>
                )}

                {results.map((r, i) => (
                  <Link
                    key={r.slug}
                    href={`/p/${r.slug}`}
                    className={`srch-row ${i === active ? "on" : ""}`}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActive(i)}
                  >
                    <span className="srch-thumb">
                      {r.image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={r.image} alt="" loading="lazy" decoding="async" />
                      ) : null}
                      {r.badge && <em className="srch-off">{r.badge}</em>}
                    </span>
                    <span className="srch-info">
                      <strong>{r.name}</strong>
                      <small>
                        {r.category}
                        {r.sub ? ` · ${r.sub}` : ""} · {r.type === "CUSTOM" ? "Tailor Made" : "Ready Made"}
                      </small>
                    </span>
                    <span className="srch-price tk">
                      {r.type === "CUSTOM" && <em>from </em>}
                      {formatTk(r.priceTk, currency)}
                      {r.wasTk > 0 && <s>{formatTk(r.wasTk, currency)}</s>}
                    </span>
                  </Link>
                ))}

                {q && results.length > 0 && (
                  <Link
                    href={`/search?q=${encodeURIComponent(q.trim())}`}
                    className="srch-all"
                    onClick={() => setOpen(false)}
                  >
                    See all results for &ldquo;{q.trim()}&rdquo; →
                  </Link>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
