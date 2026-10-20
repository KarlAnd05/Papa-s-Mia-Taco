import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Simple month calendar working on "YYYY-MM-DD" strings (no timezone conversions).

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const pad = (n: number) => String(n).padStart(2, "0");
const monthOf = (date: string) => date.slice(0, 7);

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export function MonthCalendar({
  value,
  onChange,
  isEnabled,
  minDate,
  maxDate,
  today,
}: {
  value: string | null;
  onChange: (date: string) => void;
  isEnabled: (date: string) => boolean;
  minDate: string;
  maxDate: string;
  today?: string;
}) {
  const [month, setMonth] = useState(monthOf(value ?? minDate));
  const [y, m] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${pad(i + 1)}`),
  ];

  return (
    <div className="bg-white rounded-2xl border-2 border-[#e0dcd4] p-3 sm:p-4 w-full max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          aria-label="Previous month"
          disabled={month <= monthOf(minDate)}
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#0F5D2F] hover:bg-[#0F5D2F]/10 disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-[#222]">{label}</span>
        <button
          type="button"
          aria-label="Next month"
          disabled={month >= monthOf(maxDate)}
          onClick={() => setMonth(shiftMonth(month, 1))}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#0F5D2F] hover:bg-[#0F5D2F]/10 disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-[11px] font-bold uppercase text-[#999] py-1">
            {d}
          </span>
        ))}
        {cells.map((date, i) =>
          date === null ? (
            <span key={`blank-${i}`} />
          ) : (
            <button
              key={date}
              type="button"
              disabled={!isEnabled(date)}
              onClick={() => onChange(date)}
              aria-pressed={value === date}
              aria-label={new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}
              className={`aspect-square rounded-full text-sm font-semibold transition-colors ${
                value === date
                  ? "bg-[#0F5D2F] text-white"
                  : "text-[#222] hover:bg-[#0F5D2F]/10 disabled:text-[#ccc] disabled:hover:bg-transparent disabled:cursor-not-allowed disabled:line-through"
              } ${today === date && value !== date ? "ring-2 ring-[#F4AA1C]" : ""}`}
            >
              {Number(date.slice(8))}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
