import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Bike, Loader2, Store, Wallet } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { MENU_QUERY_KEY, usePublicSettings } from "@/hooks/useMenu";
import { ApiError, apiFetch, errorMessage } from "@/lib/api";
import { money } from "@/lib/format";
import { addRecentOrder, getSavedCustomer, saveCustomer } from "@/lib/recent";
import type { MenuItem, Order } from "@/lib/types";
import { CartPanel } from "@/components/CartPanel";
import { ErrorBox, Field, FormSection, PrimaryButton, inputClass } from "@/components/site/form";
import { PageHeader } from "@/components/site/PageHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNavbar } from "@/components/site/SiteNavbar";

type OrderType = "pickup" | "delivery";

function TypeOption({
  active,
  disabled,
  onClick,
  icon,
  title,
  detail,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex-1 flex items-center gap-3 text-left rounded-2xl border-2 px-4 py-4 transition-colors ${
        active ? "border-[#0F5D2F] bg-[#0F5D2F]/[0.07]" : "border-[#e0dcd4] bg-white hover:border-[#0F5D2F]/40"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span className={`w-11 h-11 rounded-full flex items-center justify-center ${active ? "bg-[#0F5D2F] text-white" : "bg-[#0F5D2F]/10 text-[#0F5D2F]"}`}>
        {icon}
      </span>
      <span>
        <span className="block font-bold text-[#222]">{title}</span>
        <span className="block text-xs text-[#666]">{detail}</span>
      </span>
    </button>
  );
}

export default function Checkout() {
  const cart = useCart();
  const { data: settings } = usePublicSettings();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const saved = getSavedCustomer();

  const [orderType, setOrderType] = useState<OrderType>("pickup");
  const [name, setName] = useState(saved.name);
  const [phone, setPhone] = useState(saved.phone);
  const [email, setEmail] = useState(saved.email);
  const [address, setAddress] = useState(saved.address);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const ordering = settings?.ordering;
  const pickupOk = ordering?.pickupEnabled ?? true;
  const deliveryOk = ordering?.deliveryEnabled ?? false;

  useEffect(() => {
    if (orderType === "pickup" && !pickupOk && deliveryOk) setOrderType("delivery");
    if (orderType === "delivery" && !deliveryOk) setOrderType("pickup");
  }, [pickupOk, deliveryOk, orderType]);

  const deliveryFee = orderType === "delivery" ? (ordering?.deliveryFee ?? 0) : 0;
  const taxRate = settings?.tax.rate ?? 0;
  const tax = Math.round(cart.subtotal * taxRate) / 100;
  const total = cart.subtotal + deliveryFee + tax;
  const belowMinimum = !!ordering && cart.subtotal < ordering.minimumOrder;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !phone.trim()) return setError("Please enter your name and phone number.");
    if (orderType === "delivery" && !address.trim()) return setError("Please enter your delivery address.");

    setSubmitting(true);
    try {
      const order = await apiFetch<Order & { token: string }>("/public/orders", {
        body: {
          orderType,
          customer: { name, phone, email: email || null },
          deliveryAddress: orderType === "delivery" ? address : null,
          items: cart.toApiItems(),
          notes: notes || null,
        },
      });
      saveCustomer({ name, phone, email, address });
      addRecentOrder({ token: order.token, id: order.id, createdAt: order.createdAt, total: order.totalAmount });
      cart.clear();
      setLocation(`/order/status/${order.token}`);
    } catch (err) {
      setError(errorMessage(err));
      // The menu changed under the customer (item sold out / price change): refresh it and the cart
      if (err instanceof ApiError && err.status === 409) {
        const items = await queryClient.fetchQuery({
          queryKey: MENU_QUERY_KEY,
          queryFn: () => apiFetch<{ items: MenuItem[] }>("/menu-items").then((d) => d.items),
          staleTime: 0,
        });
        cart.syncWithMenu(items);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5EF] text-[#222] font-sans">
      <SiteNavbar />
      <PageHeader eyebrow="Almost there" title="Checkout" />

      {cart.lines.length === 0 ? (
        <div className="max-w-md mx-auto px-6 pb-24 text-center">
          <p className="text-[#555] mb-6">Your order is empty.</p>
          <Link href="/order" className="inline-flex items-center justify-center bg-[#0F5D2F] text-white font-bold uppercase tracking-wider text-sm px-8 py-3.5 rounded-full">
            Browse the menu
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="max-w-6xl mx-auto px-4 sm:px-6 pb-24 lg:grid lg:grid-cols-[1fr_360px] lg:gap-10 items-start">
          <div>
            {!ordering?.enabled && settings && (
              <ErrorBox>Online ordering is paused right now. Please try again later.</ErrorBox>
            )}

            <FormSection title="How would you like it?" step={1}>
              <div role="radiogroup" className="flex flex-col sm:flex-row gap-3">
                <TypeOption
                  active={orderType === "pickup"}
                  disabled={!pickupOk}
                  onClick={() => setOrderType("pickup")}
                  icon={<Store className="w-5 h-5" />}
                  title="Pickup"
                  detail={pickupOk ? `Ready in about ${ordering?.pickupMinutes ?? 20} min` : "Not available right now"}
                />
                <TypeOption
                  active={orderType === "delivery"}
                  disabled={!deliveryOk}
                  onClick={() => setOrderType("delivery")}
                  icon={<Bike className="w-5 h-5" />}
                  title="Delivery"
                  detail={
                    deliveryOk
                      ? `About ${ordering?.deliveryMinutes ?? 45} min${ordering?.deliveryFee ? ` · ${money(ordering.deliveryFee)} fee` : ""}`
                      : "Not available right now"
                  }
                />
              </div>
            </FormSection>

            <FormSection title="Your details" step={2} color="#A71F29">
              <div className="grid sm:grid-cols-2 gap-x-4">
                <Field label="Your name" required>
                  <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={80} />
                </Field>
                <Field label="Phone number" required hint="So we can reach you about your order">
                  <input className={inputClass} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required maxLength={30} />
                </Field>
              </div>
              <Field label="Email" hint="Optional">
                <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={120} />
              </Field>
              {orderType === "delivery" && (
                <Field label="Delivery address" required>
                  <textarea
                    className={`${inputClass} min-h-20 resize-y`}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    autoComplete="street-address"
                    placeholder="Street, apartment, buzzer code…"
                    maxLength={300}
                  />
                </Field>
              )}
              <Field label="Notes for the kitchen" hint="Allergies, special requests…">
                <textarea className={`${inputClass} min-h-20 resize-y`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
              </Field>
            </FormSection>

            <FormSection title="Payment" step={3} color="#F4AA1C">
              <div className="flex items-start gap-3 bg-white border-2 border-[#F4AA1C] rounded-2xl px-4 py-4">
                <Wallet className="w-6 h-6 text-[#0F5D2F] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[#222]">Pay in person — cash or card</p>
                  <p className="text-sm text-[#666]">
                    {orderType === "delivery" ? "Pay the driver when your order arrives." : "Pay at the counter when you pick up your order."}
                  </p>
                </div>
              </div>
            </FormSection>

            {error && <ErrorBox>{error}</ErrorBox>}
            {belowMinimum && <ErrorBox>The minimum order is {money(ordering!.minimumOrder)}.</ErrorBox>}

            <div className="lg:hidden mb-6">
              <CartPanel showCheckout={false} />
            </div>

            <div className="text-center">
              <PrimaryButton type="submit" disabled={submitting || belowMinimum || (!!settings && !ordering?.enabled)} className="w-full sm:w-auto">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Placing order…
                  </>
                ) : (
                  <>Place order · {money(total)}</>
                )}
              </PrimaryButton>
              <p className="text-xs text-[#999] mt-3">You'll get an order number and a page to follow your order.</p>
            </div>
          </div>

          <aside className="hidden lg:block sticky top-[90px] space-y-4">
            <CartPanel showCheckout={false} />
            <div className="bg-white rounded-2xl border-2 border-[#eee] px-5 py-4 text-sm space-y-1.5 tabular-nums">
              <div className="flex justify-between"><span className="text-[#555]">Subtotal</span><span>{money(cart.subtotal)}</span></div>
              {deliveryFee > 0 && <div className="flex justify-between"><span className="text-[#555]">Delivery fee</span><span>{money(deliveryFee)}</span></div>}
              {tax > 0 && <div className="flex justify-between"><span className="text-[#555]">{settings?.tax.label} ({taxRate}%)</span><span>{money(tax)}</span></div>}
              <div className="flex justify-between font-black text-lg text-[#0F5D2F] pt-1.5 border-t border-[#eee]"><span>Total</span><span>{money(total)}</span></div>
            </div>
            <Link href="/order" className="block text-center text-sm font-semibold text-[#0F5D2F] hover:underline">← Add more items</Link>
          </aside>
        </form>
      )}
      <SiteFooter />
    </div>
  );
}
