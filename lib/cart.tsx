"use client";
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

export type CartItem = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  type: "CUSTOM" | "READYMADE" | "FABRIC";
  /** What is charged, after any campaign discount. */
  priceTk: number;
  /** The price before that discount; absent when nothing was taken off. */
  wasTk?: number;
  /** The campaign's label, e.g. "20% OFF", for showing the saving. */
  discountLabel?: string;
  qty: number;
  image: string;
  size?: string;
  selections?: Record<string, string>;
  measurements?: Record<string, string>;
  // Fabric-by-the-yard only
  yards?: number;
  colorCode?: string;
  note?: string;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  /** Total already saved through live campaigns. */
  savings: number;
  add: (item: Omit<CartItem, "key">) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  ready: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "ab_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let loaded: CartItem[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch {}
    if (loaded.length) setItems(loaded);
    setReady(true);
    if (loaded.length === 0) return;

    // A bag keeps the price from when something was put in it, so a campaign
    // starting or ending in between would leave it showing yesterday's figure.
    // Re-price what was just loaded and correct anything that has moved. The
    // order API re-prices before charging either way; this only keeps what the
    // customer sees in step with what they will actually pay.
    let alive = true;
    fetch("/api/cart/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: loaded.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          selections: i.selections,
          fabric: i.type === "FABRIC" ? { name: i.name, yards: i.yards ?? 0 } : undefined,
        })),
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data?.lines?.length) return;
        setItems((prev) =>
          prev.map((item, i) => {
            const line = data.lines[i];
            // Only touch a line the server priced, and only if the bag hasn't
            // been changed underneath us in the meantime.
            if (!line || item.key !== loaded[i]?.key) return item;
            const wasTk = line.listTk > line.priceTk ? line.listTk : undefined;
            const label = line.discountLabel || undefined;
            if (item.priceTk === line.priceTk && item.wasTk === wasTk && item.discountLabel === label) {
              return item;
            }
            return { ...item, priceTk: line.priceTk, wasTk, discountLabel: label };
          })
        );
      })
      .catch(() => {
        // Offline, or the check failed — the bag simply keeps what it has.
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);


  const add = useCallback((item: Omit<CartItem, "key">) => {
    const key =
      item.type === "CUSTOM" || item.type === "FABRIC"
        ? `${item.productId}-${Date.now()}` // each bespoke config / fabric length is unique
        : `${item.productId}-${item.size ?? "std"}`;
    setItems((prev) => {
      const existing = prev.find((p) => p.key === key);
      if (existing) {
        return prev.map((p) => (p.key === key ? { ...p, qty: p.qty + item.qty } : p));
      }
      return [...prev, { ...item, key }];
    });
  }, []);

  const remove = useCallback((key: string) => {
    setItems((prev) => prev.filter((p) => p.key !== key));
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setItems((prev) =>
      prev.map((p) => (p.key === key ? { ...p, qty: Math.max(1, qty) } : p))
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((n, i) => n + i.qty, 0);
    const subtotal = items.reduce((n, i) => n + i.priceTk * i.qty, 0);
    // What the campaign has already taken off, so the bag can show it.
    const savings = items.reduce(
      (n, i) => n + Math.max(0, (i.wasTk ?? i.priceTk) - i.priceTk) * i.qty,
      0
    );
    return { items, count, subtotal, savings, add, remove, setQty, clear, ready };
  }, [items, add, remove, setQty, clear, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
