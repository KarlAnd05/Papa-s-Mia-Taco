import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ChevronRight, Loader2, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { groupMenu, useMenu, usePublicSettings } from "@/hooks/useMenu";
import { useCart } from "@/context/CartContext";
import { money, menuPrice } from "@/lib/format";
import { getRecentOrders } from "@/lib/recent";
import type { MenuItem } from "@/lib/types";
import { ItemOptionsDialog } from "@/components/ItemOptionsDialog";
import { CartPanel } from "@/components/CartPanel";
import { HEADING_COLORS, Zigzag } from "@/components/site/decor";
import { LoadError } from "@/components/site/form";
import { PageHeader } from "@/components/site/PageHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNavbar } from "@/components/site/SiteNavbar";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function ItemCard({ item, disabled, onAdd }: { item: MenuItem; disabled: boolean; onAdd: () => void }) {
  const soldOut = !item.isAvailable;
  return (
    <article
      className={`flex flex-col bg-white rounded-2xl border-2 p-4 sm:p-5 transition-colors ${
        soldOut ? "border-[#eee] opacity-60" : "border-[#eee] hover:border-[#0F5D2F]/40"
      }`}
    >
      <div className="flex items-start gap-2 mb-1">
        <h3 className="flex-1 font-bold text-[15px] text-[#222] leading-snug">{item.name}</h3>
        {item.isNew && (
          <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold bg-[#A71F29] text-white rounded-sm">New</span>
        )}
      </div>
      {item.description && <p className="text-[#555] text-[13px] leading-relaxed mb-1 line-clamp-3">{item.description}</p>}
      {item.options.length > 0 && !soldOut && (
        <p className="text-[11px] font-semibold text-[#0F5D2F] italic">Options available</p>
      )}
      <div className="mt-auto pt-3 flex items-center justify-between gap-3">
        <span className="text-lg font-extrabold text-[#0F5D2F] tabular-nums">{menuPrice(item.price)}</span>
        {soldOut ? (
          <span className="text-xs font-bold uppercase tracking-wider text-[#999]">Sold out</span>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 min-h-10 px-4 rounded-full bg-[#0F5D2F] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#0F5D2F]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label={`Add ${item.name}`}
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>
    </article>
  );
}

export default function OrderOnline() {
  const { data: items, isLoading, isError, isFetching, refetch } = useMenu();
  const { data: settings } = usePublicSettings();
  const cart = useCart();
  const { toast } = useToast();
  const [optionsItem, setOptionsItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const recentOrders = useMemo(getRecentOrders, []);

  const sections = useMemo(() => groupMenu(items ?? []), [items]);
  const orderingOpen = settings?.ordering.enabled ?? true;

  // Keep the saved cart in line with the current menu (prices, removed/sold-out items)
  useEffect(() => {
    if (items) cart.syncWithMenu(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const add = (item: MenuItem) => {
    if (item.options.length) return setOptionsItem(item);
    cart.add(item, {}, 1);
    toast({ title: `${item.name} added`, description: "Open your order to check out." });
  };

  return (
    <div className="min-h-screen bg-[#F8F5EF] text-[#222] font-sans">
      <SiteNavbar />
      <PageHeader
        eyebrow="Pickup or delivery"
        title="Order Online"
        subtitle={
          <>
            Pick your favourites and we'll get cooking. You pay in person{" "}
            {settings?.ordering.deliveryEnabled ? "at pickup or on delivery" : "when you pick up"} — cash or card.
          </>
        }
      />

      {!orderingOpen && (
        <div className="max-w-3xl mx-auto px-4 mb-8">
          <div className="bg-[#A71F29] text-white rounded-2xl px-6 py-5 text-center shadow-md">
            <p className="font-bold uppercase tracking-wider text-sm mb-1">Online ordering is paused right now</p>
            <p className="text-sm text-white/90">
              You can still browse the menu. Please check back soon{settings?.restaurant.phone ? ` or call us at ${settings.restaurant.phone}` : ""}.
            </p>
          </div>
        </div>
      )}

      {recentOrders.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-6">
          <Link
            href={`/order/status/${recentOrders[0].token}`}
            className="flex items-center gap-3 bg-white border-2 border-[#F4AA1C] rounded-xl px-4 py-3 text-sm hover:bg-[#F4AA1C]/10 transition-colors"
          >
            <span className="font-bold text-[#222]">Track your last order #{recentOrders[0].id}</span>
            <span className="text-[#666]">{money(recentOrders[0].total)}</span>
            <ChevronRight className="w-4 h-4 ml-auto text-[#0F5D2F]" />
          </Link>
        </div>
      )}

      {/* Category chips */}
      {sections.length > 0 && (
        <div className="sticky top-[66px] z-30 bg-[#F8F5EF]/95 backdrop-blur border-b border-[#0F5D2F]/15">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex lg:flex-wrap gap-2 overflow-x-auto [scrollbar-width:none]">
            {sections.map((s) => (
              <a
                key={s.category}
                href={`#${slug(s.category)}`}
                className="flex-shrink-0 px-4 py-2 rounded-full border-2 border-[#0F5D2F]/25 bg-white text-xs font-bold uppercase tracking-wider text-[#0F5D2F] hover:border-[#0F5D2F] hover:bg-[#0F5D2F] hover:text-white transition-colors"
              >
                {s.category}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-32 lg:pb-20 lg:grid lg:grid-cols-[1fr_340px] lg:gap-8 items-start">
        <main>
          {isLoading && (
            <div className="flex justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-[#0F5D2F]" />
            </div>
          )}
          {isError && !items && (
            <div className="max-w-xl mx-auto py-12">
              <LoadError what="the menu" onRetry={() => refetch()} retrying={isFetching} />
            </div>
          )}

          {sections.map((section, idx) => {
            const color = HEADING_COLORS[idx % 3];
            return (
              <section key={section.category} id={slug(section.category)} className="scroll-mt-36 mb-12">
                <div className="text-center mb-5">
                  <h2 className="font-serif italic font-black text-[2rem] sm:text-[2.4rem] leading-none" style={{ color }}>
                    {section.category}
                  </h2>
                  <Zigzag color={color} width={140} />
                </div>
                {section.callout && (
                  <div className="bg-[#A71F29] text-white text-center text-xs sm:text-sm font-bold tracking-wider uppercase px-4 py-2 rounded-lg mb-5 shadow-md">
                    {section.callout}
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  {section.items.map((item) => (
                    <ItemCard key={item.id} item={item} disabled={!orderingOpen} onAdd={() => add(item)} />
                  ))}
                </div>
              </section>
            );
          })}
        </main>

        <aside className="hidden lg:block sticky top-[140px]">
          <CartPanel />
        </aside>
      </div>

      {/* Mobile cart bar */}
      {cart.count > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-gradient-to-t from-[#F8F5EF] via-[#F8F5EF] to-transparent">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="w-full flex items-center gap-3 min-h-14 px-5 rounded-full bg-[#0F5D2F] text-white shadow-xl"
          >
            <span className="inline-flex items-center justify-center min-w-7 h-7 px-1.5 rounded-full bg-[#F4AA1C] text-[#222] text-xs font-black">
              {cart.count}
            </span>
            <span className="font-bold uppercase tracking-wider text-sm">View order</span>
            <span className="ml-auto font-black tabular-nums">{money(cart.subtotal)}</span>
          </button>
        </div>
      )}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="bg-[#F8F5EF] p-3 pt-10 max-h-[90vh] overflow-y-auto rounded-t-3xl">
          <SheetTitle className="sr-only">Your order</SheetTitle>
          <CartPanel onNavigate={() => setCartOpen(false)} />
        </SheetContent>
      </Sheet>

      <ItemOptionsDialog
        item={optionsItem}
        open={optionsItem !== null}
        onOpenChange={(o) => !o && setOptionsItem(null)}
        onAdd={(item, selections, quantity) => {
          cart.add(item, selections, quantity);
          toast({ title: `${item.name} added`, description: "Open your order to check out." });
        }}
      />

      <SiteFooter />
    </div>
  );
}
