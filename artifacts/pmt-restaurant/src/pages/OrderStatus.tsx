import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Printer, XCircle } from "lucide-react";
import { usePublicSettings } from "@/hooks/useMenu";
import { apiFetch } from "@/lib/api";
import { PAYMENT_LABELS, money } from "@/lib/format";
import type { Order } from "@/lib/types";
import { PrintPortal, Receipt } from "@/components/Receipt";
import { PageHeader } from "@/components/site/PageHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNavbar } from "@/components/site/SiteNavbar";

// Customer order tracking + invoice (no account: the link itself is the key).
export default function OrderStatus() {
  const { token } = useParams<{ token: string }>();
  const { data: settings } = usePublicSettings();
  const { data: order, isLoading, error } = useQuery({
    queryKey: ["public-order", token],
    queryFn: () => apiFetch<Order>(`/public/orders/${token}`),
    refetchInterval: (q) => (q.state.data && ["completed", "cancelled"].includes(q.state.data.status) ? false : 20_000),
    refetchOnWindowFocus: true,
  });

  const delivery = order?.orderType === "delivery";
  const steps = [
    { key: "pending", label: "Received" },
    { key: "preparing", label: "Preparing" },
    { key: "ready", label: delivery ? "On its way" : "Ready for pickup" },
    { key: "completed", label: delivery ? "Delivered" : "Picked up" },
  ];
  const currentIdx = order ? steps.findIndex((s) => s.key === order.status) : -1;

  return (
    <div className="min-h-screen bg-[#F8F5EF] text-[#222] font-sans">
      <SiteNavbar />
      {isLoading && (
        <div className="flex justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-[#0F5D2F]" />
        </div>
      )}
      {error && !order && (
        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <p className="text-[#A71F29] font-semibold mb-6">We couldn't find this order.</p>
          <Link href="/order" className="text-[#0F5D2F] font-bold underline">Back to the menu</Link>
        </div>
      )}

      {order && (
        <>
          <PageHeader
            eyebrow={`Order #${order.id}`}
            title={order.status === "cancelled" ? "Order cancelled" : `Gracias, ${order.customerName?.split(" ")[0] ?? "amigo"}!`}
            subtitle={
              order.status === "cancelled"
                ? undefined
                : order.status === "completed"
                  ? "Enjoy your meal — see you again soon!"
                  : `We've got your order. ${delivery ? "Delivery" : "Pickup"} in about ${order.estimatedMinutes} minutes.`
            }
          />

          <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-24 space-y-6">
            {order.status === "cancelled" ? (
              <div className="flex items-start gap-3 bg-[#fef2f2] border-2 border-[#A71F29] rounded-2xl px-5 py-4">
                <XCircle className="w-6 h-6 text-[#A71F29] flex-shrink-0" />
                <p className="text-sm text-[#A71F29] font-semibold">
                  This order was cancelled. Questions? Call us{settings?.restaurant.phone ? ` at ${settings.restaurant.phone}` : ""}.
                </p>
              </div>
            ) : (
              <ol className="bg-white rounded-2xl border-2 border-[#0F5D2F] px-4 sm:px-6 py-5 grid grid-cols-4 gap-1" aria-label="Order progress">
                {steps.map((step, i) => {
                  const done = i < currentIdx || order.status === "completed";
                  const current = i === currentIdx && order.status !== "completed";
                  return (
                    <li key={step.key} className="flex flex-col items-center text-center relative">
                      {i > 0 && (
                        <span className={`absolute top-4 right-1/2 w-full h-1 -z-0 ${i <= currentIdx ? "bg-[#0F5D2F]" : "bg-[#e0dcd4]"}`} />
                      )}
                      <span
                        className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center border-2 font-black text-sm ${
                          done ? "bg-[#0F5D2F] border-[#0F5D2F] text-white" : current ? "bg-[#F4AA1C] border-[#F4AA1C] text-[#222] animate-pulse" : "bg-white border-[#e0dcd4] text-[#999]"
                        }`}
                      >
                        {done ? <Check className="w-4 h-4" strokeWidth={3} /> : i + 1}
                      </span>
                      <span className={`mt-2 text-[11px] sm:text-xs font-bold uppercase tracking-wide ${done || current ? "text-[#0F5D2F]" : "text-[#999]"}`}>
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            {order.status !== "cancelled" && order.status !== "completed" && (
              <p className="text-center text-sm text-[#555]">
                {PAYMENT_LABELS[order.paymentMethod ?? ""] ?? "Pay in person"} · Total <strong>{money(order.totalAmount)}</strong>
                <span className="block text-xs text-[#999] mt-1">This page updates automatically. Keep it open or bookmark it.</span>
              </p>
            )}

            <div className="bg-white rounded-2xl border-2 border-[#eee] p-5 sm:p-7">
              <Receipt order={order} settings={settings} title="Invoice" />
            </div>
            <PrintPortal>
              <Receipt order={order} settings={settings} title="Invoice" />
            </PrintPortal>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-full border-2 border-[#0F5D2F] text-[#0F5D2F] font-bold uppercase tracking-wider text-sm hover:bg-[#0F5D2F] hover:text-white transition-colors"
              >
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
              <Link
                href="/order"
                className="inline-flex items-center justify-center min-h-12 px-6 rounded-full bg-[#0F5D2F] text-white font-bold uppercase tracking-wider text-sm hover:bg-[#0F5D2F]/90 transition-colors"
              >
                Order again
              </Link>
            </div>
          </div>
        </>
      )}
      <SiteFooter />
    </div>
  );
}
