import { useRef } from "react";
import { Link, useLocation } from "wouter";
import { FaFacebookF, FaInstagram, FaTiktok } from "react-icons/fa";
import { usePublicSettings } from "@/hooks/useMenu";

// Tapping the footer logo 5 times quickly opens the staff login (hidden from customers).
function useSecretTaps(onUnlock: () => void, taps = 5, windowMs = 3000) {
  const times = useRef<number[]>([]);
  return () => {
    const now = Date.now();
    times.current = [...times.current.filter((t) => now - t < windowMs), now];
    if (times.current.length >= taps) {
      times.current = [];
      onUnlock();
    }
  };
}

export function SiteFooter() {
  const [, setLocation] = useLocation();
  const onLogoTap = useSecretTaps(() => setLocation("/admin/login"));
  // Contact details are managed in Admin → Settings
  const r = usePublicSettings().data?.restaurant;
  const hours = (r?.hours ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const socials = [
    { url: r?.instagram, label: "Instagram", Icon: FaInstagram },
    { url: r?.facebook, label: "Facebook", Icon: FaFacebookF },
    { url: r?.tiktok, label: "TikTok", Icon: FaTiktok },
  ].filter((s) => s.url);

  return (
    <footer className="relative bg-[#0F5D2F] pt-20 pb-10 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-10">
         <svg viewBox="0 0 1440 30" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 30, transform: 'scaleY(-1)' }}>
            <path d="M0,15 C240,30 480,0 720,15 C960,30 1200,0 1440,15 L1440,30 L0,30 Z" fill="#F8F5EF" />
         </svg>
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10 flex flex-col md:flex-row justify-between items-start gap-12 pt-8">
        <div className="max-w-xs">
          <img
            src={`${import.meta.env.BASE_URL}logo.webp`}
            alt="Papa's Mia Tacos"
            width={129}
            height={120}
            draggable={false}
            onClick={onLogoTap}
            className="h-28 w-auto mb-6 select-none [-webkit-touch-callout:none]"
          />
          <p className="text-[#F8F5EF] text-sm leading-relaxed mb-8 font-medium">
            Made with love, served with fire.
          </p>
          {socials.length > 0 && (
            <div className="flex gap-4">
              {socials.map(({ url, label, Icon }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-full border-2 border-[#F4AA1C] flex items-center justify-center text-[#F4AA1C] hover:bg-[#F4AA1C] hover:text-[#0F5D2F] transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-10 sm:gap-12 text-sm w-full md:w-auto">
          {hours.length > 0 && (
            <div className="col-span-2 sm:col-span-1">
              <h5 className="text-[#F4AA1C] font-black tracking-widest uppercase mb-6 text-xs">Hours</h5>
              <ul className="space-y-3 text-[#F8F5EF] font-medium">
                {hours.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </div>
          )}
          {r && (
            <div>
              <h5 className="text-[#F4AA1C] font-black tracking-widest uppercase mb-6 text-xs">Find us</h5>
              <ul className="space-y-3 text-[#F8F5EF] font-medium">
                {r.address && <li className="whitespace-pre-line">{r.address}</li>}
                {r.location && !r.address.includes(r.location) && <li>{r.location}</li>}
                {r.phone && (
                  <li>
                    <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="hover:text-[#F4AA1C] transition-colors whitespace-nowrap">{r.phone}</a>
                  </li>
                )}
              </ul>
            </div>
          )}
          <div>
            <h5 className="text-[#F4AA1C] font-black tracking-widest uppercase mb-6 text-xs">Eat with us</h5>
            <ul className="space-y-3 text-[#F8F5EF] font-medium">
              <li><Link href="/order" className="hover:text-[#F4AA1C] transition-colors">Order online</Link></li>
              <li><Link href="/reservations" className="hover:text-[#F4AA1C] transition-colors">Book a table</Link></li>
              <li><Link href="/feedback" className="hover:text-[#F4AA1C] transition-colors">Leave feedback</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-20 pt-8 border-t-2 border-[#F8F5EF]/20 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-[#F8F5EF]/60">
        <p>© {new Date().getFullYear()} {r?.name ?? "Papa's Mia Tacos"}. All rights reserved.</p>
      </div>
    </footer>
  );
}
