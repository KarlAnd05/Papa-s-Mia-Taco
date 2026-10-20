import { useState } from "react";
import { useLocation } from "wouter";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote, Bike, Calculator, ChevronLeft, ChevronRight, CreditCard, Loader2, MapPin, Phone, Printer, Search, Store, Utensils, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePublicSettings } from "@/hooks/useMenu";
import { apiFetch, errorMessage } from "@/lib/api";
import { ORDER_TYPE_LABELS, PAYMENT_LABELS, formatDateTime, money, orderStatusLabel } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";
import { PrintPortal, Receipt } from "@/components/Receipt";

// Order management: incoming online orders, POS sales and order history.

type OrdersResponse = { orders: Order[]; total: number; page: number; totalPages: number };
type Tab = "active" | "completed" | "cancelled" | "all";

const STATUS_CLASSES: Record<OrderStatus, string> = {
  pending: "bg-secondary text-secondary-foreground",
  preparing: "bg-accent text-accent-foreground",
  ready: "bg-primary text-primary-foreground",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/15 text-destructive",
};

function minutesAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return formatDateTime(iso);
}

function TypeIcon({ type }: { type: Order["orderType"] }) {
  if (type === "delivery") return <Bike className="w-3.5 h-3.5" />;
  if (type === "dine_in") return <Utensils className="w-3.5 h-3.5" />;
  return <Store className="w-3.5 h-3.5" />;
}

// Buttons that move an order to its next status
function StatusActions({ order, onUpdate, busy, size = "default" }: {
  order: Order;
  onUpdate: (status: OrderStatus, paymentMethod?: "cash" | "card") => void;
  busy: boolean;
  size?: "default" | "sm";
}) {
  const [completing, setCompleting] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const h = size === "sm" ? "h-10" : "h-11";
  if (order.status === "completed" || order.status === "cancelled") return null;
  const payInPerson = order.paymentMethod === "pay_on_pickup" || order.paymentMethod === "pay_on_delivery";

  if (completing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">Paid by:</span>
        <Button className={h} disabled={busy} onClick={() => onUpdate("completed", "cash")}><Banknote className="w-4 h-4 mr-1" /> Cash</Button>
        <Button className={h} disabled={busy} onClick={() => onUpdate("completed", "card")}><CreditCard className="w-4 h-4 mr-1" /> Card</Button>
        <Button variant="ghost" className={h} onClick={() => setCompleting(false)}>Back</Button>
      </div>
    );
  }
  if (confirmCancel) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-destructive">Cancel this order?</span>
        <Button variant="destructive" className={h} disabled={busy} onClick={() => onUpdate("cancelled")}>Yes, cancel</Button>
        <Button variant="ghost" className={h} onClick={() => setConfirmCancel(false)}>Keep</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {order.status === "pending" && <Button className={`${h} font-bold`} disabled={busy} onClick={() => onUpdate("preparing")}>Accept & prepare</Button>}
      {order.status === "preparing" && (
        <Button className={`${h} font-bold`} disabled={busy} onClick={() => onUpdate("ready")}>
          {order.orderType === "delivery" ? "Out for delivery" : "Mark ready"}
        </Button>
      )}
      {(order.status === "ready" || order.status === "preparing") && (
        <Button
          variant={order.status === "ready" ? "default" : "outline"}
          className={`${h} font-bold`}
          disabled={busy}
          onClick={() => (payInPerson ? setCompleting(true) : onUpdate("completed"))}
        >
          Complete
        </Button>
      )}
      <Button variant="ghost" className={`${h} text-muted-foreground hover:text-destructive`} disabled={busy} onClick={() => setConfirmCancel(true)}>
        Cancel
      </Button>
    </div>
  );
}

function OrderCard({ order, onOpen, onUpdate, busy }: {
  order: Order;
  onOpen: () => void;
  onUpdate: (status: OrderStatus, paymentMethod?: "cash" | "card") => void;
  busy: boolean;
}) {
  const isNew = order.status === "pending";
  return (
    <div className={`bg-card rounded-xl border-2 p-4 flex flex-col gap-3 ${isNew ? "border-secondary shadow-md" : "border-border"}`}>
      <button type="button" onClick={onOpen} className="text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg font-black text-foreground">#{order.id}</span>
          <Badge className={`${STATUS_CLASSES[order.status]} border-0`}>{orderStatusLabel(order.status, order.orderType)}</Badge>
          <Badge variant="outline" className="gap-1">
            <TypeIcon type={order.orderType} />
            {order.orderType ? ORDER_TYPE_LABELS[order.orderType] : "Order"}
            {order.tableLabel ? ` · ${order.tableLabel}` : ""}
          </Badge>
          <Badge variant="outline" className={order.source === "online" ? "border-primary text-primary" : ""}>
            {order.source === "online" ? "Online" : "POS"}
          </Badge>
          <span className="ml-auto text-xs text-muted-foreground">{minutesAgo(order.createdAt)}</span>
        </div>
        {(order.customerName || order.customer) && (
          <p className="text-sm font-semibold text-foreground mt-2">
            {order.customerName ?? order.customer?.name}
            {order.customerPhone && <span className="font-normal text-muted-foreground"> · {order.customerPhone}</span>}
          </p>
        )}
        {order.deliveryAddress && (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />{order.deliveryAddress}</p>
        )}
        <ul className="mt-2 space-y-0.5 text-sm">
          {order.items.map((it) => (
            <li key={it.id}>
              <span className="font-bold">{it.quantity}×</span> {it.itemName}
              {it.options.length > 0 && <span className="text-xs text-muted-foreground"> ({it.options.map((o) => o.choice).join(", ")})</span>}
            </li>
          ))}
        </ul>
        {order.notes && <p className="mt-2 text-xs bg-accent/20 rounded px-2 py-1 text-foreground">Note: {order.notes}</p>}
        <div className="flex items-baseline justify-between mt-3">
          <span className="text-xs text-muted-foreground">{order.paymentMethod ? PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod : ""}</span>
          <span className="text-xl font-black text-primary tabular-nums">{money(order.totalAmount)}</span>
        </div>
      </button>
      <StatusActions order={order} onUpdate={onUpdate} busy={busy} size="sm" />
    </div>
  );
}

export function AdminOrdersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings } = usePublicSettings();
  const [tab, setTab] = useState<Tab>("active");
  const [source, setSource] = useState<"all" | "online" | "pos">("all");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const params = new URLSearchParams({ status: tab, source, page: String(page), limit: tab === "active" ? "50" : "20" });
  if (search.trim()) params.set("search", search.trim());
  if (date) params.set("date", date);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-orders", tab, source, search.trim(), date, page],
    queryFn: () => apiFetch<OrdersResponse>(`/orders?${params}`),
    refetchInterval: tab === "active" ? 10_000 : false,
    placeholderData: keepPreviousData,
  });

  const selected = data?.orders.find((o) => o.id === selectedId) ?? null;

  const updateStatus = async (order: Order, status: OrderStatus, paymentMethod?: "cash" | "card") => {
    setBusyId(order.id);
    try {
      await apiFetch(`/orders/${order.id}/status`, { method: "PATCH", body: { status, paymentMethod } });
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats-today"] });
      toast({ title: `Order #${order.id} — ${orderStatusLabel(status, order.orderType)}` });
    } catch (err) {
      toast({ title: "Couldn't update order", description: errorMessage(err), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
    { key: "all", label: "All orders" },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-1">Orders</h1>
          <p className="text-muted-foreground">Online orders arrive here automatically. This page refreshes every few seconds.</p>
        </div>
        <Button className="h-11" onClick={() => setLocation("/admin/pos")}>
          <Calculator className="w-4 h-4 mr-2" /> New sale (POS)
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`h-10 px-4 rounded-full text-sm font-bold whitespace-nowrap border-2 transition-colors ${
              tab === t.key ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-foreground hover:border-primary/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 bg-card h-10" placeholder="Search by order #, name or phone…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={source} onValueChange={(v) => { setSource(v as typeof source); setPage(1); }}>
          <SelectTrigger className="md:w-40 bg-card h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="pos">POS</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1 items-center">
          <Input type="date" className="bg-card h-10 md:w-44" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} aria-label="Filter by date" />
          {date && <Button variant="ghost" size="icon" onClick={() => setDate("")} aria-label="Clear date"><X className="w-4 h-4" /></Button>}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : !data?.orders.length ? (
        <div className="text-center py-20 text-muted-foreground">
          {tab === "active" ? "No active orders right now. New online orders will appear here automatically." : "No orders found."}
        </div>
      ) : (
        <div className={`grid gap-3 ${tab === "active" ? "md:grid-cols-2 2xl:grid-cols-3" : "md:grid-cols-2"} ${isFetching ? "opacity-90" : ""}`}>
          {data.orders.map((o) => (
            <OrderCard key={o.id} order={o} onOpen={() => setSelectedId(o.id)} onUpdate={(s, pm) => updateStatus(o, s, pm)} busy={busyId === o.id} />
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages} · {data.total} orders</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Order details */}
      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="bg-card sm:max-w-lg max-h-[92vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl text-primary flex items-center gap-3">
                  Order #{selected.id}
                  <Badge className={`${STATUS_CLASSES[selected.status]} border-0 font-sans`}>{orderStatusLabel(selected.status, selected.orderType)}</Badge>
                </DialogTitle>
              </DialogHeader>
              {(selected.customerPhone || selected.customerEmail) && (
                <div className="flex flex-wrap gap-2 text-sm">
                  {selected.customerPhone && (
                    <a href={`tel:${selected.customerPhone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 font-semibold hover:border-primary">
                      <Phone className="w-4 h-4 text-primary" /> {selected.customerPhone}
                    </a>
                  )}
                  {selected.customerEmail && <span className="inline-flex items-center rounded-lg border border-border px-3 py-2">{selected.customerEmail}</span>}
                </div>
              )}
              <div className="border border-border rounded-xl p-4 bg-white">
                <Receipt order={selected} settings={settings} title={selected.source === "online" ? "Online order" : "Receipt"} />
              </div>
              <PrintPortal>
                <Receipt order={selected} settings={settings} title={selected.source === "online" ? "Online order" : "Receipt"} />
              </PrintPortal>
              <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
                <Button variant="outline" className="h-11" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-2" /> Print
                </Button>
                <StatusActions order={selected} onUpdate={(s, pm) => updateStatus(selected, s, pm)} busy={busyId === selected.id} />
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
