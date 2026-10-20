import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { optionLabels, selectionsToApi, unitPriceFor } from "@/lib/format";
import type { MenuItem, Selections } from "@/lib/types";

// Customer online-ordering cart, kept in localStorage so it survives page reloads.

export type CartLine = {
  key: string; // item + chosen options; identical choices are merged into one line
  menuItemId: number;
  name: string;
  selections: Selections;
  optionLabels: string[];
  unitPrice: number; // display only — the server re-prices every order
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (item: MenuItem, selections: Selections, quantity: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  // Drop lines whose items were removed and refresh prices from the current menu
  syncWithMenu: (items: MenuItem[]) => void;
  toApiItems: () => { menuItemId: number; quantity: number; selections: { groupId: string; choiceIds: string[] }[] }[];
};

const STORAGE_KEY = "pmt_cart_v1";
const CartContext = createContext<CartContextValue | null>(null);

const lineKey = (menuItemId: number, selections: Selections) =>
  `${menuItemId}|${Object.keys(selections)
    .sort()
    .map((g) => `${g}:${[...selections[g]].sort().join(",")}`)
    .join(";")}`;

function loadCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // storage unavailable (private mode) — cart still works for this visit
    }
  }, [lines]);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = Math.round(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) * 100) / 100;
    return {
      lines,
      count,
      subtotal,
      add: (item, selections, quantity) => {
        const key = lineKey(item.id, selections);
        setLines((prev) => {
          const existing = prev.find((l) => l.key === key);
          if (existing) return prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(99, l.quantity + quantity) } : l));
          return [
            ...prev,
            {
              key,
              menuItemId: item.id,
              name: item.name,
              selections,
              optionLabels: optionLabels(item, selections),
              unitPrice: unitPriceFor(item, selections),
              quantity,
            },
          ];
        });
      },
      setQuantity: (key, quantity) =>
        setLines((prev) =>
          quantity <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(99, quantity) } : l)),
        ),
      remove: (key) => setLines((prev) => prev.filter((l) => l.key !== key)),
      clear: () => setLines([]),
      syncWithMenu: (items) =>
        setLines((prev) => {
          const byId = new Map(items.map((i) => [i.id, i]));
          const next = prev
            .filter((l) => byId.get(l.menuItemId)?.isAvailable)
            .map((l) => {
              const item = byId.get(l.menuItemId)!;
              return { ...l, name: item.name, unitPrice: unitPriceFor(item, l.selections), optionLabels: optionLabels(item, l.selections) };
            });
          return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
        }),
      toApiItems: () =>
        lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity, selections: selectionsToApi(l.selections) })),
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
