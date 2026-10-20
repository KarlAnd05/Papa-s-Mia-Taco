import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { PapelPicadoBorder } from "./decor";

const home = import.meta.env.BASE_URL;

// Public site navigation. Deliberately has no staff/admin links.
// variant "overlay" = Home page (fixed over the hero); "page" = other pages (papel picado + sticky bar).
export function SiteNavbar({ variant = "page" }: { variant?: "overlay" | "page" }) {
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  // Home: the bar starts below the papel picado border and moves up once the border scrolls away
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (variant !== "overlay") return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  const cartBadge = count > 0 && (
    <span className="ml-1.5 inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-[#F4AA1C] text-[#222] text-[10px] font-black">
      {count}
    </span>
  );

  const bar = (
    <nav
      className={
        variant === "overlay"
          ? `fixed left-0 right-0 z-40 bg-[#F8F5EF]/95 backdrop-blur-md border-b-2 border-[#0F5D2F] shadow-sm transition-[top] duration-200 ${scrolled ? "top-0" : "top-[40px]"}`
          : "sticky top-0 z-40 bg-[#F8F5EF]/95 backdrop-blur-md border-b-2 border-[#0F5D2F] shadow-sm"
      }
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[64px] flex items-center justify-between">
        <Link href="/" className="flex items-center" aria-label="Papa's Mia Tacos — home">
          <img src={`${home}logo.webp`} alt="Papa's Mia Tacos" width={60} height={56} className="h-14 w-auto" />
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-6 text-sm font-semibold tracking-wide">
          <a href={`${home}#menu`} className="hover:text-[#0F5D2F] transition-colors uppercase">Menu</a>
          <a href={`${home}#about`} className="hover:text-[#0F5D2F] transition-colors uppercase">About</a>
          <Link href="/feedback" className="hover:text-[#0F5D2F] transition-colors uppercase">Feedback</Link>
          <Link href="/reservations" className="text-[#A71F29] hover:bg-[#A71F29] hover:text-white transition-colors uppercase text-xs font-bold border-2 border-[#A71F29] px-4 py-1.5 rounded-full">
            Book a Table
          </Link>
          <Link href="/order" className="inline-flex items-center bg-[#0F5D2F] text-white hover:bg-[#0F5D2F]/90 transition-colors uppercase text-xs font-bold border-2 border-[#0F5D2F] px-4 py-1.5 rounded-full">
            Order Online{cartBadge}
          </Link>
        </div>

        {/* Mobile: order shortcut + hamburger */}
        <div className="lg:hidden flex items-center gap-2">
          <Link href="/order" className="inline-flex items-center bg-[#0F5D2F] text-white uppercase text-[11px] font-bold px-3 py-1.5 rounded-full">
            Order{cartBadge}
          </Link>
          <button
            className="p-2 rounded-lg text-[#0F5D2F] hover:bg-[#0F5D2F]/10 transition-colors"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="lg:hidden bg-[#F8F5EF] border-t border-[#0F5D2F]/20 px-4 pb-4 flex flex-col gap-1 text-sm font-semibold">
          <a href={`${home}#menu`} onClick={() => setOpen(false)} className="py-3 border-b border-[#0F5D2F]/10 uppercase tracking-wide text-[#222] hover:text-[#0F5D2F]">Menu</a>
          <Link href="/order" onClick={() => setOpen(false)} className="py-3 border-b border-[#0F5D2F]/10 uppercase tracking-wide text-[#0F5D2F] font-bold">Order Online</Link>
          <Link href="/reservations" onClick={() => setOpen(false)} className="py-3 border-b border-[#0F5D2F]/10 uppercase tracking-wide text-[#A71F29] font-bold">Book a Table</Link>
          <a href={`${home}#about`} onClick={() => setOpen(false)} className="py-3 border-b border-[#0F5D2F]/10 uppercase tracking-wide text-[#222] hover:text-[#0F5D2F]">About</a>
          <Link href="/feedback" onClick={() => setOpen(false)} className="py-3 uppercase tracking-wide text-[#222] hover:text-[#0F5D2F]">Leave Feedback</Link>
        </div>
      )}
    </nav>
  );

  if (variant === "overlay") return bar;
  return (
    <>
      <PapelPicadoBorder />
      {bar}
    </>
  );
}
