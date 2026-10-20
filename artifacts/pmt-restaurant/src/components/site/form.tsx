import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";

// Form building blocks for the customer pages, matching the Feedback form style.

export const inputClass =
  "w-full px-3.5 py-2.5 border-2 border-[#e0dcd4] rounded-lg bg-white text-base sm:text-sm text-[#222] placeholder:text-[#999] outline-none focus:border-[#0F5D2F] transition-colors";

export function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block text-[13px] font-semibold uppercase tracking-wide text-[#333] mb-1.5">
        {label}
        {required && <span className="text-[#A71F29] ml-0.5">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-[#888] mt-1">{hint}</span>}
    </label>
  );
}

export function FormSection({ title, color = "#0F5D2F", step, children }: { title: string; color?: string; step?: number; children: ReactNode }) {
  return (
    <section className="mb-9">
      <div className="flex items-center gap-3 mb-4">
        {step !== undefined && (
          <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black" style={{ background: color }}>
            {step}
          </span>
        )}
        <h2 className="font-serif text-[1.35rem] font-black m-0" style={{ color }}>
          {title}
        </h2>
        <div className="flex-1 h-0.5 rounded" style={{ background: `linear-gradient(to right, ${color}40, transparent)` }} />
      </div>
      {children}
    </section>
  );
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="bg-[#fef2f2] border-2 border-[#A71F29] rounded-xl px-4 py-3 mb-5 text-sm font-semibold text-[#A71F29]">
      {children}
    </div>
  );
}

export function PrimaryButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 bg-[#0F5D2F] text-white font-extrabold uppercase tracking-[0.1em] text-[15px] px-10 py-4 rounded-full shadow-[0_4px_16px_rgba(15,93,47,0.3)] hover:bg-[#0F5D2F]/90 disabled:bg-[#999] disabled:shadow-none disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

// Shown instead of an empty section when data can't be loaded (e.g. a network hiccup)
export function LoadError({ what, onRetry, retrying }: { what: string; onRetry: () => void; retrying: boolean }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 bg-white border-2 border-[#A71F29] rounded-xl px-4 py-3">
      <p className="text-sm font-semibold text-[#A71F29] flex-1 min-w-48">We couldn't load {what}. Please check your connection and try again.</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="inline-flex items-center gap-2 min-h-10 px-4 rounded-full bg-[#0F5D2F] text-white text-xs font-bold uppercase tracking-wider disabled:opacity-60"
      >
        <RefreshCw className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`} /> Try again
      </button>
    </div>
  );
}
