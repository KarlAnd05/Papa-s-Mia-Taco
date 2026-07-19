import { useState, useMemo } from "react";
import { menuData, type MenuItem } from "@/data/menu";
import { useListCustomers } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Minus, ShoppingCart, Trash2, User, Search, ChevronDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── Types ──────────────────────────────────────────────────────────────────

type CartItem = {
  itemName: string;
  itemCategory: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

// ── Quantity button ────────────────────────────────────────────────────────

function QtyControl({ qty, onInc, onDec }: { qty: number; onInc: () => void; onDec: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onDec}
        disabled={qty === 0}
        className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className={`w-7 text-center text-sm font-bold tabular-nums ${qty > 0 ? "text-primary" : "text-muted-foreground"}`}>
        {qty}
      </span>
      <button
        type="button"
        onClick={onInc}
        className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Customer picker ────────────────────────────────────────────────────────

function CustomerPicker({
  value,
  onChange,
}: {
  value: { id: number; name: string } | null;
  onChange: (c: { id: number; name: string } | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data } = useListCustomers({ search: search || undefined, limit: 8 });

  const handleSelect = (c: { id: number; name: string }) => {
    onChange(c);
    setSearch("");
    setOpen(false);
  };

  return (
    <div className="relative">
      {value ? (
        <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">{value.name}</span>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search customer name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              className="pl-9 text-sm h-9"
            />
          </div>
          {open && (
            <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-lg shadow-xl overflow-hidden">
              {!data?.customers?.length ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  {search ? "No customers found" : "Type to search customers"}
                </div>
              ) : (
                data.customers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => handleSelect({ id: c.id, name: c.name })}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/5 text-left transition-colors border-b border-border/50 last:border-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.email || c.phone || "No contact"}</p>
                    </div>
                    <Badge className="ml-auto capitalize text-[10px]" variant="outline">{c.loyaltyTier}</Badge>
                  </button>
                ))
              )}
              <button
                type="button"
                onMouseDown={() => { onChange(null); setOpen(false); }}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border"
              >
                Continue without linking a customer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Orders Page ───────────────────────────────────────────────────────

export function AdminOrdersPage() {
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [customer, setCustomer] = useState<{ id: number; name: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const cartKey = (cat: string, name: string) => `${cat}::${name}`;

  const getQty = (cat: string, name: string) => cart[cartKey(cat, name)]?.quantity ?? 0;

  const setQty = (item: MenuItem, cat: string, delta: number) => {
    const key = cartKey(cat, item.name);
    setCart((prev) => {
      const current = prev[key]?.quantity ?? 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [key]: {
          itemName: item.name,
          itemCategory: cat,
          quantity: next,
          unitPrice: item.price,
          lineTotal: next * item.price,
        },
      };
    });
  };

  const cartItems = Object.values(cart);
  const subtotal = cartItems.reduce((s, i) => s + i.lineTotal, 0);
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);

  const handleSubmit = async () => {
    if (cartItems.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerId: customer?.id ?? null,
          items: cartItems,
          notes: notes || null,
          status: "completed",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to place order");
      }
      setSuccess(true);
      setCart({});
      setCustomer(null);
      setNotes("");
      setTimeout(() => setSuccess(false), 3000);
      toast({ title: "Order placed successfully!" });
    } catch (err: any) {
      toast({ title: "Error placing order", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Only menu sections that have priced items
  const menuSections = menuData.filter((s) => s.items.some((i) => i.price > 0));

  return (
    <div className="flex gap-6 h-[calc(100vh-100px)] overflow-hidden">

      {/* ── Left: Menu ── */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">New Order</h1>
          <p className="text-sm text-muted-foreground mt-1">Select items from the menu, then confirm on the right.</p>
        </div>

        {menuSections.map((section) => (
          <Card key={section.category} className="border-border bg-card">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                {section.category}
              </CardTitle>
              {section.callout && (
                <p className="text-xs text-primary font-semibold">{section.callout}</p>
              )}
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-1">
              {section.items.map((item) => {
                const qty = getQty(section.category, item.name);
                return (
                  <div
                    key={item.name}
                    className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors ${qty > 0 ? "bg-primary/5 border border-primary/15" : "hover:bg-muted/50"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">{item.name}</span>
                        {item.isNew && (
                          <Badge className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0 h-4">NEW</Badge>
                        )}
                      </div>
                      {item.desc && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.desc}</p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-primary tabular-nums flex-shrink-0">
                      ${item.price.toFixed(2)}
                    </span>
                    <QtyControl
                      qty={qty}
                      onInc={() => setQty(item, section.category, 1)}
                      onDec={() => setQty(item, section.category, -1)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Right: Order Summary ── */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">

        {/* Success flash */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3 text-green-600">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-semibold">Order placed!</p>
          </div>
        )}

        {/* Cart */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              Order Summary
              {totalItems > 0 && (
                <Badge className="ml-auto bg-primary text-primary-foreground text-xs">{totalItems} items</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {cartItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Add items from the menu</p>
            ) : (
              <div className="space-y-2">
                {cartItems.map((item) => (
                  <div key={`${item.itemCategory}::${item.itemName}`} className="flex items-start justify-between gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground truncate block">{item.itemName}</span>
                      <span className="text-xs text-muted-foreground">{item.quantity} × ${item.unitPrice.toFixed(2)}</span>
                    </div>
                    <span className="font-bold text-foreground tabular-nums">${item.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-border mt-3 pt-3 flex justify-between font-bold">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary text-lg">${subtotal.toFixed(2)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCart({})}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors mt-1"
                >
                  Clear order
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Link Customer
              <span className="text-xs font-normal text-muted-foreground ml-auto">Optional</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <CustomerPicker value={customer} onChange={setCustomer} />
            {customer && (
              <p className="text-xs text-muted-foreground mt-2">
                Loyalty points and order stats will be updated automatically.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-bold text-foreground">Notes</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <textarea
              className="w-full text-sm bg-background border border-border rounded-lg p-3 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              rows={3}
              placeholder="Special requests, allergies, table number..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          className="w-full h-12 text-sm font-bold"
          disabled={cartItems.length === 0 || submitting}
          onClick={handleSubmit}
          data-testid="place-order-btn"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Placing Order...</>
          ) : (
            <>Place Order · ${subtotal.toFixed(2)}</>
          )}
        </Button>
      </div>
    </div>
  );
}
