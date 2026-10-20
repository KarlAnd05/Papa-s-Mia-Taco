import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Banknote, ChevronDown, CreditCard, Loader2, Minus, Percent, Plus, Printer, Search, ShoppingCart, Tag, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { groupMenu, useMenu, usePublicSettings } from "@/hooks/useMenu";
import { apiFetch, errorMessage } from "@/lib/api";
import { money, optionLabels, selectionsToApi, unitPriceFor } from "@/lib/format";
import type { MenuItem, Order, Selections } from "@/lib/types";
import { CustomerPicker } from "@/components/CustomerPicker";
import { ItemOptionsDialog } from "@/components/ItemOptionsDialog";
import { PrintPortal, Receipt } from "@/components/Receipt";

// Cashier point of sale: big touch targets, menu from the shared menu database,
// discounts, cash/card payment and printable receipts.

type PosLine = { key: string; item: MenuItem; selections: Selections; quantity: number };
type Discount = { type: "percent" | "amount"; value: number; reason: string } | null;

const CATEGORY_COLORS = ["#0F5D2F", "#A71F29", "#F4AA1C"];
const toCents = (n: number) => Math.round(n * 100);
const lineKey = (id: number, s: Selections) =>
  `${id}|${Object.keys(s).sort().map((g) => `${g}:${[...s[g]].sort().join(",")}`).join(";")}`;

function computeTotals(lines: PosLine[], discount: Discount, taxRate: number) {
  const subtotal = lines.reduce((sum, l) => sum + toCents(unitPriceFor(l.item, l.selections)) * l.quantity, 0);
  let disc = 0;
  if (discount && discount.value > 0) {
    disc = discount.type === "percent" ? Math.round((subtotal * Math.min(discount.value, 100)) / 100) : Math.min(toCents(discount.value), subtotal);
  }
  const tax = Math.round(((subtotal - disc) * taxRate) / 100);
  return { subtotal: subtotal / 100, discount: disc / 100, tax: tax / 100, total: (subtotal - disc + tax) / 100 };
}

// ── Discount dialog ─────────────────────────────────────────────────────────

function DiscountDialog({ open, onOpenChange, current, onApply }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  current: Discount;
  onApply: (d: Discount) => void;
}) {
  const [type, setType] = useState<"percent" | "amount">(current?.type ?? "percent");
  const [value, setValue] = useState(current ? String(current.value) : "");
  const [reason, setReason] = useState(current?.reason ?? "");

  const apply = (t = type, v = value) => {
    const n = parseFloat(v);
    onApply(n > 0 ? { type: t, value: t === "percent" ? Math.min(n, 100) : n, reason: reason.trim() } : null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">Discount</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["percent", "amount"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`h-12 rounded-xl border-2 font-bold ${type === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
              >
                {t === "percent" ? "Percent (%)" : "Amount ($)"}
              </button>
            ))}
          </div>
          {type === "percent" && (
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 20].map((p) => (
                <button key={p} type="button" onClick={() => apply("percent", String(p))} className="h-12 rounded-xl border-2 border-border bg-background font-bold hover:border-primary">
                  {p}%
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step={type === "percent" ? "1" : "0.25"}
              placeholder={type === "percent" ? "Custom %" : "Amount off"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-12 text-lg bg-background"
            />
            <span className="h-12 w-12 flex items-center justify-center rounded-lg bg-muted font-bold">{type === "percent" ? "%" : "$"}</span>
          </div>
          <Input placeholder="Reason (optional) — e.g. staff meal, regular" value={reason} onChange={(e) => setReason(e.target.value)} className="h-11 bg-background" maxLength={120} />
        </div>
        <DialogFooter className="gap-2">
          {current && (
            <Button variant="outline" onClick={() => { onApply(null); onOpenChange(false); }} className="h-11">
              Remove discount
            </Button>
          )}
          <Button onClick={() => apply()} className="h-11">Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Payment dialog ──────────────────────────────────────────────────────────

function PaymentDialog({ open, onOpenChange, total, submitting, onConfirm }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  total: number;
  submitting: boolean;
  onConfirm: (method: "cash" | "card", tendered: number | null) => void;
}) {
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [tendered, setTendered] = useState("");
  const received = tendered === "" ? total : parseFloat(tendered) || 0;
  const change = Math.max(0, Math.round((received - total) * 100) / 100);
  const short = method === "cash" && received + 0.0001 < total;

  const quick = useMemo(() => {
    const set = new Set<number>([total]);
    for (const step of [5, 10, 20]) set.add(Math.ceil(total / step) * step);
    for (const note of [20, 50, 100]) if (note > total) set.add(note);
    return [...set].filter((v) => v >= total).sort((a, b) => a - b).slice(0, 6);
  }, [total]);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (o) setTendered(""); }}>
      <DialogContent className="bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">Take payment</DialogTitle>
        </DialogHeader>
        <div className="text-center py-2">
          <p className="text-sm uppercase tracking-widest text-muted-foreground font-bold">Total due</p>
          <p className="text-5xl font-black text-foreground tabular-nums">{money(total)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setMethod("cash")} className={`h-16 rounded-xl border-2 font-bold flex items-center justify-center gap-2 text-lg ${method === "cash" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
            <Banknote className="w-6 h-6" /> Cash
          </button>
          <button type="button" onClick={() => setMethod("card")} className={`h-16 rounded-xl border-2 font-bold flex items-center justify-center gap-2 text-lg ${method === "card" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
            <CreditCard className="w-6 h-6" /> Card
          </button>
        </div>
        {method === "cash" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {quick.map((v) => (
                <button key={v} type="button" onClick={() => setTendered(v.toFixed(2))} className={`h-12 rounded-xl border-2 font-bold tabular-nums ${received === v ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary"}`}>
                  {v === total ? "Exact" : money(v)}
                </button>
              ))}
            </div>
            <Input type="number" inputMode="decimal" min="0" step="0.05" placeholder={`Cash received (${money(total)})`} value={tendered} onChange={(e) => setTendered(e.target.value)} className="h-12 text-lg bg-background" />
            <div className={`flex justify-between items-center rounded-xl px-4 py-3 ${short ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
              <span className="font-bold uppercase tracking-wide text-sm">{short ? "Not enough cash" : "Change due"}</span>
              <span className="text-3xl font-black tabular-nums">{money(short ? total - received : change)}</span>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            className="w-full h-14 text-lg font-bold"
            disabled={short || submitting}
            onClick={() => onConfirm(method, method === "cash" ? received : null)}
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Complete sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Ticket (current order) ──────────────────────────────────────────────────

type TicketProps = {
  lines: PosLine[];
  setLines: React.Dispatch<React.SetStateAction<PosLine[]>>;
  orderType: "takeaway" | "dine_in";
  setOrderType: (t: "takeaway" | "dine_in") => void;
  tableLabel: string;
  setTableLabel: (v: string) => void;
  customer: { id: number; name: string } | null;
  setCustomer: (c: { id: number; name: string } | null) => void;
  notes: string;
  setNotes: (v: string) => void;
  discount: Discount;
  onDiscount: () => void;
  onClearDiscount: () => void;
  totals: ReturnType<typeof computeTotals>;
  taxLabel: string;
  onCharge: () => void;
  onClear: () => void;
};

function Ticket(p: TicketProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const count = p.lines.reduce((s, l) => s + l.quantity, 0);
  const changeQty = (key: string, delta: number) =>
    p.setLines((prev) => prev.flatMap((l) => (l.key !== key ? [l] : l.quantity + delta <= 0 ? [] : [{ ...l, quantity: Math.min(99, l.quantity + delta) }])));

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-foreground">Current order</h2>
        {count > 0 && <span className="text-xs font-bold text-muted-foreground">{count} items</span>}
        {p.lines.length > 0 && (
          <button type="button" onClick={p.onClear} className="ml-auto text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-destructive px-2 py-1">
            Clear
          </button>
        )}
      </div>

      <div className="px-3 pt-3 grid grid-cols-2 gap-2">
        {(["takeaway", "dine_in"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => p.setOrderType(t)}
            className={`h-11 rounded-xl border-2 text-sm font-bold ${p.orderType === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`}
          >
            {t === "takeaway" ? "Takeaway" : "Dine-in"}
          </button>
        ))}
      </div>
      <div className="px-3 pt-2">
        <Input
          placeholder={p.orderType === "dine_in" ? "Table number" : "Customer name (optional)"}
          value={p.tableLabel}
          onChange={(e) => p.setTableLabel(e.target.value)}
          className="h-10 bg-background"
          maxLength={40}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-[120px]">
        {p.lines.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Tap items on the left to add them.</p>
        ) : (
          <ul className="space-y-2">
            {p.lines.map((l) => {
              const unit = unitPriceFor(l.item, l.selections);
              const labels = optionLabels(l.item, l.selections);
              return (
                <li key={l.key} className="rounded-xl border border-border bg-background px-3 py-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground leading-tight">{l.item.name}</p>
                      {labels.length > 0 && <p className="text-xs text-muted-foreground mt-0.5">{labels.join(" · ")}</p>}
                    </div>
                    <span className="font-bold text-sm tabular-nums">{money(unit * l.quantity)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button type="button" aria-label="Decrease" onClick={() => changeQty(l.key, -1)} className="w-10 h-10 rounded-lg border-2 border-border flex items-center justify-center hover:border-primary active:bg-primary/10">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-black tabular-nums">{l.quantity}</span>
                    <button type="button" aria-label="Increase" onClick={() => changeQty(l.key, 1)} className="w-10 h-10 rounded-lg border-2 border-border flex items-center justify-center hover:border-primary active:bg-primary/10">
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-muted-foreground ml-1">@ {money(unit)}</span>
                    <button type="button" aria-label="Remove item" onClick={() => p.setLines((prev) => prev.filter((x) => x.key !== l.key))} className="ml-auto w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border px-3 pt-2">
        <button type="button" onClick={() => setMoreOpen((o) => !o)} className="w-full flex items-center justify-between py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <span>
            Customer & note
            {(p.customer || p.notes) && <span className="ml-2 text-primary">· {p.customer?.name ?? "note added"}</span>}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
        </button>
        {moreOpen && (
          <div className="space-y-2 pb-2">
            <CustomerPicker value={p.customer} onChange={p.setCustomer} />
            <textarea
              className="w-full text-sm bg-background border border-border rounded-lg p-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              rows={2}
              placeholder="Note (allergies, special requests…)"
              value={p.notes}
              onChange={(e) => p.setNotes(e.target.value)}
              maxLength={500}
            />
          </div>
        )}
      </div>

      <div className="border-t border-border px-4 py-3 space-y-1 text-sm tabular-nums">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{money(p.totals.subtotal)}</span></div>
        {p.discount ? (
          <div className="flex justify-between items-center text-secondary">
            <button type="button" onClick={p.onDiscount} className="flex items-center gap-1 font-semibold">
              <Tag className="w-3.5 h-3.5" />
              Discount {p.discount.type === "percent" ? `${p.discount.value}%` : ""}
              {p.discount.reason ? ` · ${p.discount.reason}` : ""}
            </button>
            <span className="flex items-center gap-1">
              −{money(p.totals.discount)}
              <button type="button" aria-label="Remove discount" onClick={p.onClearDiscount} className="p-1 hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
            </span>
          </div>
        ) : (
          <button type="button" onClick={p.onDiscount} disabled={!p.lines.length} className="flex items-center gap-1 text-primary font-semibold disabled:opacity-40">
            <Percent className="w-3.5 h-3.5" /> Add discount
          </button>
        )}
        {p.totals.tax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{p.taxLabel}</span><span>{money(p.totals.tax)}</span></div>}
        <div className="flex justify-between items-baseline pt-1">
          <span className="font-bold uppercase tracking-wide">Total</span>
          <span className="text-3xl font-black text-primary">{money(p.totals.total)}</span>
        </div>
      </div>
      <div className="px-3 pb-3">
        <Button className="w-full h-16 text-xl font-black uppercase tracking-wider" disabled={!p.lines.length} onClick={p.onCharge}>
          Charge {money(p.totals.total)}
        </Button>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export function AdminPOS() {
  const { data: items, isLoading } = useMenu();
  const { data: settings } = usePublicSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<PosLine[]>([]);
  const [orderType, setOrderType] = useState<"takeaway" | "dine_in">("takeaway");
  const [tableLabel, setTableLabel] = useState("");
  const [customer, setCustomer] = useState<{ id: number; name: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState<Discount>(null);
  const [optionsItem, setOptionsItem] = useState<MenuItem | null>(null);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);

  const sections = useMemo(() => groupMenu(items ?? []), [items]);
  const activeCategory = category ?? sections[0]?.category ?? null;
  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term) return (items ?? []).filter((i) => i.name.toLowerCase().includes(term) || i.category.toLowerCase().includes(term));
    return sections.find((s) => s.category === activeCategory)?.items ?? [];
  }, [items, sections, activeCategory, search]);

  const totals = computeTotals(lines, discount, settings?.tax.rate ?? 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const qtyByItem = useMemo(() => {
    const m = new Map<number, number>();
    for (const l of lines) m.set(l.item.id, (m.get(l.item.id) ?? 0) + l.quantity);
    return m;
  }, [lines]);

  const addLine = (item: MenuItem, selections: Selections, quantity: number) => {
    const key = lineKey(item.id, selections);
    setLines((prev) =>
      prev.some((l) => l.key === key)
        ? prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(99, l.quantity + quantity) } : l))
        : [...prev, { key, item, selections, quantity }],
    );
  };

  const tapItem = (item: MenuItem) => {
    if (!item.isAvailable) return;
    if (item.options.length) setOptionsItem(item);
    else addLine(item, {}, 1);
  };

  const reset = () => {
    setLines([]);
    setDiscount(null);
    setCustomer(null);
    setNotes("");
    setTableLabel("");
  };

  const charge = async (method: "cash" | "card", tendered: number | null) => {
    setSubmitting(true);
    try {
      const order = await apiFetch<Order>("/orders", {
        body: {
          orderType,
          tableLabel: tableLabel || null,
          customerId: customer?.id ?? null,
          items: lines.map((l) => ({ menuItemId: l.item.id, quantity: l.quantity, selections: selectionsToApi(l.selections) })),
          discount: discount ? { type: discount.type, value: discount.value, reason: discount.reason || undefined } : null,
          paymentMethod: method,
          amountTendered: tendered,
          notes: notes || null,
        },
      });
      setPayOpen(false);
      setTicketOpen(false);
      setReceipt(order);
      reset();
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats-today"] });
    } catch (err) {
      toast({ title: "Sale not completed", description: errorMessage(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const ticket = (
    <Ticket
      lines={lines}
      setLines={setLines}
      orderType={orderType}
      setOrderType={setOrderType}
      tableLabel={tableLabel}
      setTableLabel={setTableLabel}
      customer={customer}
      setCustomer={setCustomer}
      notes={notes}
      setNotes={setNotes}
      discount={discount}
      onDiscount={() => setDiscountOpen(true)}
      onClearDiscount={() => setDiscount(null)}
      totals={totals}
      taxLabel={`${settings?.tax.label ?? "Tax"} (${settings?.tax.rate ?? 0}%)`}
      onCharge={() => setPayOpen(true)}
      onClear={reset}
    />
  );

  return (
    <div className="h-full flex gap-3">
      {/* Menu */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search menu…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11 bg-card" />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {!search && (
          <div className="flex gap-2 pb-2 overflow-x-auto [scrollbar-width:none] lg:flex-wrap lg:overflow-visible">
            {sections.map((s, i) => {
              const active = s.category === activeCategory;
              const color = CATEGORY_COLORS[i % 3];
              return (
                <button
                  key={s.category}
                  type="button"
                  onClick={() => setCategory(s.category)}
                  className="flex-shrink-0 h-11 lg:h-12 px-4 lg:px-5 rounded-xl border-2 text-sm font-bold whitespace-nowrap transition-colors"
                  style={active ? { background: color, borderColor: color, color: color === "#F4AA1C" ? "#222" : "#fff" } : { borderColor: `${color}55`, color: "#222", background: "hsl(var(--card))" }}
                >
                  {s.category}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-24 lg:pb-2">
          {isLoading ? (
            <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
              {visibleItems.map((item) => {
                const qty = qtyByItem.get(item.id) ?? 0;
                const color = CATEGORY_COLORS[Math.max(0, sections.findIndex((s) => s.category === item.category)) % 3];
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.isAvailable}
                    onClick={() => tapItem(item)}
                    className={`relative min-h-[104px] flex flex-col text-left rounded-xl border-2 bg-card p-3 pl-4 overflow-hidden transition-all active:scale-[0.97] ${
                      qty ? "border-primary shadow-md" : "border-border hover:border-primary/50"
                    } disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100`}
                  >
                    <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: color }} />
                    {qty > 0 && (
                      <span className="absolute top-2 right-2 min-w-7 h-7 px-1.5 rounded-full bg-primary text-primary-foreground text-sm font-black flex items-center justify-center">
                        {qty}
                      </span>
                    )}
                    <span className={`font-bold text-[15px] leading-tight text-foreground ${qty ? "pr-8" : ""}`}>{item.name}</span>
                    {!item.isAvailable ? (
                      <span className="text-[10px] font-bold uppercase text-destructive mt-1">Unavailable</span>
                    ) : item.options.length > 0 ? (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mt-1">+ options</span>
                    ) : null}
                    <span className="mt-auto pt-2 text-lg font-black text-primary tabular-nums">{money(item.price)}</span>
                  </button>
                );
              })}
              {visibleItems.length === 0 && <p className="col-span-full text-center text-muted-foreground py-16">No items found.</p>}
            </div>
          )}
        </div>
      </div>

      {/* Ticket: side panel on large screens, bottom sheet on small ones */}
      <div className="hidden lg:block w-[320px] xl:w-[380px] flex-shrink-0">{ticket}</div>
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 p-2 bg-background/95 border-t border-border">
        <Button className="w-full h-14 text-base font-bold justify-between px-5" onClick={() => setTicketOpen(true)}>
          <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Order ({count})</span>
          <span className="text-lg font-black">{money(totals.total)}</span>
        </Button>
      </div>
      <Sheet open={ticketOpen} onOpenChange={setTicketOpen}>
        <SheetContent side="bottom" className="h-[92vh] p-2 pt-10 bg-background">
          <SheetTitle className="sr-only">Current order</SheetTitle>
          {ticket}
        </SheetContent>
      </Sheet>

      <ItemOptionsDialog
        item={optionsItem}
        open={optionsItem !== null}
        onOpenChange={(o) => !o && setOptionsItem(null)}
        onAdd={addLine}
        confirmLabel="Add"
      />
      <DiscountDialog key={discountOpen ? "open" : "closed"} open={discountOpen} onOpenChange={setDiscountOpen} current={discount} onApply={setDiscount} />
      <PaymentDialog open={payOpen} onOpenChange={setPayOpen} total={totals.total} submitting={submitting} onConfirm={charge} />

      {/* Receipt after a completed sale */}
      <Dialog open={receipt !== null} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="bg-card sm:max-w-sm max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary">Sale complete</DialogTitle>
          </DialogHeader>
          {receipt && (
            <>
              {receipt.changeDue != null && receipt.changeDue > 0 && (
                <div className="rounded-xl bg-primary/10 text-primary px-4 py-3 flex justify-between items-center">
                  <span className="font-bold uppercase text-sm">Change due</span>
                  <span className="text-3xl font-black tabular-nums">{money(receipt.changeDue)}</span>
                </div>
              )}
              <div className="border border-border rounded-xl p-4 bg-white">
                <Receipt order={receipt} settings={settings} />
              </div>
              <PrintPortal>
                <Receipt order={receipt} settings={settings} />
              </PrintPortal>
            </>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-12" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Print receipt
            </Button>
            <Button className="h-12" onClick={() => setReceipt(null)}>New sale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
