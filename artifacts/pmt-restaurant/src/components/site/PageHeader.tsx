import type { ReactNode } from "react";
import { Zigzag } from "./decor";

// Page title block used on the customer pages (same style as the Feedback page).
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  color = "#0F5D2F",
  accent = "#F4AA1C",
}: {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  color?: string;
  accent?: string;
}) {
  return (
    <div className="text-center px-6 pt-12 pb-8">
      <p className="text-xs font-bold uppercase tracking-[0.15em] mb-2 text-[#A71F29]">{eyebrow}</p>
      <h1
        className="font-serif italic font-black leading-[1.1] mb-1"
        style={{ fontSize: "clamp(2.2rem, 5vw, 3.5rem)", color }}
      >
        {title}
      </h1>
      <Zigzag color={accent} width={240} />
      {subtitle && <p className="text-[15px] text-[#555] max-w-xl mx-auto mt-4 leading-relaxed">{subtitle}</p>}
    </div>
  );
}
