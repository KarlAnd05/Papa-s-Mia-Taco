import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { ORDER_TYPE_LABELS, PAYMENT_LABELS, money } from "@/lib/format";
import type { Order, Settings } from "@/lib/types";

// Receipt / invoice layout shared by the POS, admin orders and the customer order page.
// Print it by wrapping a copy in <PrintPortal> and calling window.print(); the print styles
// in index.css size it for 80mm thermal receipt printers (it also prints fine on A4/Letter).
export function Receipt({ order, settings, title = "Receipt" }: { order: Order; settings?: Settings; title?: string }) {
  const r = settings?.restaurant;
  const discountLabel =
    order.discountType === "percent" && order.discountValue ? `Discount (${order.discountValue}%)` : "Discount";

  return (
    <div className="receipt font-mono text-[13px] leading-snug text-[#222] bg-white">
      <div className="text-center mb-3">
        <div className="font-serif italic font-black text-2xl text-[#0F5D2F] receipt-brand">{r?.name ?? "Papa's Mia Tacos"}</div>
        {r?.address && <div className="text-[11px]">{r.address}</div>}
        {r?.phone && <div className="text-[11px]">{r.phone}</div>}
      </div>

      <div className="border-t border-dashed border-[#999] pt-2 mb-2 text-[12px] space-y-0.5">
        <div className="flex justify-between font-bold"><span>{title}</span><span>#{order.id}</span></div>
        <div className="flex justify-between"><span>Date</span><span>{new Date(order.createdAt).toLocaleString()}</span></div>
        {order.orderType && (
          <div className="flex justify-between">
            <span>Type</span>
            <span>
              {ORDER_TYPE_LABELS[order.orderType]}
              {order.tableLabel ? ` · ${order.tableLabel}` : ""}
            </span>
          </div>
        )}
        {order.customerName && <div className="flex justify-between"><span>Customer</span><span>{order.customerName}</span></div>}
        {order.customerPhone && <div className="flex justify-between"><span>Phone</span><span>{order.customerPhone}</span></div>}
        {order.deliveryAddress && (
          <div><span>Deliver to: </span><span>{order.deliveryAddress}</span></div>
        )}
      </div>

      <div className="border-t border-dashed border-[#999] pt-2 space-y-1.5">
        {order.items.map((it) => (
          <div key={it.id}>
            <div className="flex justify-between gap-2">
              <span>
                {it.quantity} × {it.itemName}
              </span>
              <span className="tabular-nums whitespace-nowrap">{money(it.lineTotal)}</span>
            </div>
            {it.options.length > 0 && (
              <div className="pl-4 text-[11px] text-[#555]">
                {it.options.map((o) => `${o.choice}${o.price ? ` +${money(o.price)}` : ""}`).join(", ")}
              </div>
            )}
            {it.quantity > 1 && <div className="pl-4 text-[11px] text-[#555]">@ {money(it.unitPrice)} each</div>}
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-[#999] mt-2 pt-2 space-y-0.5 tabular-nums">
        <div className="flex justify-between"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
        {order.discountAmount > 0 && (
          <div className="flex justify-between">
            <span>{discountLabel}{order.discountReason ? ` – ${order.discountReason}` : ""}</span>
            <span>−{money(order.discountAmount)}</span>
          </div>
        )}
        {order.deliveryFee > 0 && <div className="flex justify-between"><span>Delivery fee</span><span>{money(order.deliveryFee)}</span></div>}
        {order.taxAmount > 0 && (
          <div className="flex justify-between">
            <span>{settings?.tax.label ?? "Tax"}{settings?.tax.rate ? ` (${settings.tax.rate}%)` : ""}</span>
            <span>{money(order.taxAmount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-[15px] border-t border-[#222] mt-1 pt-1">
          <span>TOTAL</span><span>{money(order.totalAmount)}</span>
        </div>
        {order.paymentMethod && (
          <div className="flex justify-between"><span>Payment</span><span>{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</span></div>
        )}
        {order.amountTendered != null && order.paymentMethod === "cash" && (
          <>
            <div className="flex justify-between"><span>Cash received</span><span>{money(order.amountTendered)}</span></div>
            <div className="flex justify-between font-bold"><span>Change</span><span>{money(order.changeDue ?? 0)}</span></div>
          </>
        )}
      </div>

      {order.notes && <div className="border-t border-dashed border-[#999] mt-2 pt-2 text-[12px]">Note: {order.notes}</div>}

      <div className="text-center mt-4 text-[12px]">¡Muchas gracias! · Made with love, served with fire.</div>
    </div>
  );
}

// Renders its children straight under <body>, hidden on screen and the only thing visible when
// printing (see .print-root in index.css). Mount at most one at a time.
export function PrintPortal({ children }: { children: ReactNode }) {
  return createPortal(<div className="print-root">{children}</div>, document.body);
}
