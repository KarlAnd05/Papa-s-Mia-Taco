import { Link } from "wouter";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { money } from "@/lib/format";

// The customer's cart: lines with quantity controls, and the subtotal.
export function CartPanel({ showCheckout = true, onNavigate }: { showCheckout?: boolean; onNavigate?: () => void }) {
  const cart = useCart();

  return (
    <div className="bg-white rounded-2xl border-2 border-[#0F5D2F] overflow-hidden">
      <div className="bg-[#0F5D2F] text-white px-5 py-3.5 flex items-center gap-2">
        <ShoppingBag className="w-5 h-5 text-[#F4AA1C]" />
        <h2 className="font-serif italic font-black text-xl">Your Order</h2>
        {cart.count > 0 && <span className="ml-auto text-xs font-bold uppercase tracking-wider text-[#F4AA1C]">{cart.count} items</span>}
      </div>

      {cart.lines.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="text-4xl mb-2">🌮</div>
          <p className="text-sm text-[#666]">Your order is empty. Add something tasty from the menu.</p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-[#eee] max-h-[45vh] overflow-y-auto">
            {cart.lines.map((line) => (
              <li key={line.key} className="px-5 py-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#222]">{line.name}</p>
                    {line.optionLabels.length > 0 && <p className="text-xs text-[#666] mt-0.5">{line.optionLabels.join(" · ")}</p>}
                  </div>
                  <span className="text-sm font-bold tabular-nums text-[#222]">{money(line.unitPrice * line.quantity)}</span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <button
                    type="button"
                    aria-label={`Remove one ${line.name}`}
                    onClick={() => cart.setQuantity(line.key, line.quantity - 1)}
                    className="w-8 h-8 rounded-full border-2 border-[#e0dcd4] flex items-center justify-center text-[#0F5D2F] hover:border-[#0F5D2F]"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold tabular-nums">{line.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Add one ${line.name}`}
                    onClick={() => cart.setQuantity(line.key, line.quantity + 1)}
                    className="w-8 h-8 rounded-full border-2 border-[#e0dcd4] flex items-center justify-center text-[#0F5D2F] hover:border-[#0F5D2F]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => cart.remove(line.key)}
                    className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[#999] hover:text-[#A71F29] px-2 py-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="px-5 py-4 border-t-2 border-dashed border-[#e0dcd4]">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold uppercase tracking-wide text-[#555]">Subtotal</span>
              <span className="text-xl font-black text-[#0F5D2F] tabular-nums">{money(cart.subtotal)}</span>
            </div>
            {showCheckout && (
              <Link
                href="/order/checkout"
                onClick={onNavigate}
                className="mt-4 flex w-full items-center justify-center min-h-12 rounded-full bg-[#0F5D2F] text-white font-extrabold uppercase tracking-[0.1em] text-sm hover:bg-[#0F5D2F]/90 transition-colors"
              >
                Checkout
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
