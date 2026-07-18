"use client";
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

export type CartItem = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  type: "CUSTOM" | "READYMADE" | "FABRIC";
  priceTk: number;
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
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setReady(true);
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
    return { items, count, subtotal, add, remove, setQty, clear, ready };
  }, [items, add, remove, setQty, clear, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
