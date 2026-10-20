import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, Loader2, Minus, Plus, Search } from "lucide-react";
import { usePublicSettings } from "@/hooks/useMenu";
import { apiFetch, errorMessage } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/format";
import { addRecentReservation, getRecentReservations, getSavedCustomer, saveCustomer } from "@/lib/recent";
import type { PublicReservation } from "@/lib/types";
import { MonthCalendar } from "@/components/MonthCalendar";
import { ErrorBox, Field, FormSection, LoadError, PrimaryButton, inputClass } from "@/components/site/form";
import { PageHeader } from "@/components/site/PageHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNavbar } from "@/components/site/SiteNavbar";

type DatesResponse = { today: string; lastDay: string; maxPartySize: number; enabled: boolean; dates: string[] };
type AvailabilityResponse = { date: string; closedReason: string | null; slots: { time: string; available: boolean }[] };

function FindReservation() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { token } = await apiFetch<{ token: string }>("/reservations/lookup", { body: { code, phone } });
      setLocation(`/reservations/status/${token}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border-2 border-[#eee] p-5">
      <h3 className="font-bold text-[#222] mb-1 flex items-center gap-2">
        <Search className="w-4 h-4 text-[#0F5D2F]" /> Find my reservation
      </h3>
      <p className="text-xs text-[#666] mb-3">Enter the reference code and phone number you booked with.</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input className={`${inputClass} sm:w-36 uppercase`} placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={12} required aria-label="Reservation code" />
        <input className={inputClass} type="tel" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} required aria-label="Phone number" />
        <button type="submit" disabled={busy} className="min-h-11 px-5 rounded-lg bg-[#0F5D2F] text-white text-sm font-bold uppercase tracking-wider disabled:opacity-50">
          {busy ? "…" : "Find"}
        </button>
      </div>
      {error && <p className="text-sm text-[#A71F29] font-semibold mt-2">{error}</p>}
    </form>
  );
}

export default function Reservations() {
  const [, setLocation] = useLocation();
  const { data: settings } = usePublicSettings();
  const saved = getSavedCustomer();
  const recent = useMemo(getRecentReservations, []);

  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState(saved.name);
  const [phone, setPhone] = useState(saved.phone);
  const [email, setEmail] = useState(saved.email);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const maxParty = settings?.reservations.maxPartySize ?? 12;

  const datesQuery = useQuery({
    queryKey: ["reservation-dates", partySize],
    queryFn: () => apiFetch<DatesResponse>(`/reservations/dates?partySize=${partySize}`),
    staleTime: 30_000,
    retry: 3,
    // Keep showing the calendar (same month) while the guest count changes
    placeholderData: keepPreviousData,
  });
  const allowedDates = useMemo(() => new Set(datesQuery.data?.dates ?? []), [datesQuery.data]);

  const slotsQuery = useQuery({
    queryKey: ["reservation-availability", date, partySize],
    queryFn: () => apiFetch<AvailabilityResponse>(`/reservations/availability?date=${date}&partySize=${partySize}`),
    enabled: !!date,
    staleTime: 15_000,
    retry: 3,
  });

  // Clear the chosen date/time if they stop being available for the party size
  useEffect(() => {
    if (date && datesQuery.data && !allowedDates.has(date)) {
      setDate(null);
      setTime(null);
    }
  }, [allowedDates, datesQuery.data, date]);
  useEffect(() => {
    if (time && slotsQuery.data && !slotsQuery.data.slots.find((s) => s.time === time)?.available) setTime(null);
  }, [slotsQuery.data, time]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!date || !time) return setError("Please choose a date and time.");
    setSubmitting(true);
    try {
      const r = await apiFetch<PublicReservation & { token: string }>("/reservations", {
        body: { date, time, partySize, name, phone, email: email || null, comments: comments || null },
      });
      saveCustomer({ name, phone, email });
      addRecentReservation({ token: r.token, code: r.code, date: r.date, time: r.time, partySize: r.partySize });
      setLocation(`/reservations/status/${r.token}`);
    } catch (err) {
      setError(errorMessage(err));
      slotsQuery.refetch();
      datesQuery.refetch();
    } finally {
      setSubmitting(false);
    }
  };

  const closed = settings && !settings.reservations.enabled;

  return (
    <div className="min-h-screen bg-[#F8F5EF] text-[#222] font-sans">
      <SiteNavbar />
      <PageHeader
        eyebrow="Book a table"
        title="Reserve Your Table"
        color="#A71F29"
        subtitle="Tell us when you're coming and we'll save you a seat. You'll see your booking status right after you send the request."
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-24">
        {recent.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#666] mb-2">Your reservations on this device</h3>
            <div className="space-y-2">
              {recent.map((r) => (
                <Link
                  key={r.token}
                  href={`/reservations/status/${r.token}`}
                  className="flex items-center gap-3 bg-white border-2 border-[#eee] hover:border-[#0F5D2F]/40 rounded-xl px-4 py-3 text-sm transition-colors"
                >
                  <CalendarDays className="w-4 h-4 text-[#A71F29]" />
                  <span className="font-bold">{formatDate(r.date, { weekday: "short", month: "short", day: "numeric" })}</span>
                  <span>{formatTime(r.time)}</span>
                  <span className="text-[#666]">· {r.partySize} guests</span>
                  <span className="ml-auto font-mono text-xs text-[#999]">{r.code}</span>
                  <ChevronRight className="w-4 h-4 text-[#0F5D2F]" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {closed ? (
          <div className="bg-[#A71F29] text-white rounded-2xl px-6 py-8 text-center mb-10">
            <p className="font-bold uppercase tracking-wider mb-1">Online reservations are closed right now</p>
            <p className="text-sm text-white/90">Please call us{settings.restaurant.phone ? ` at ${settings.restaurant.phone}` : ""} to book a table.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <FormSection title="How many guests?" step={1} color="#A71F29">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 rounded-full border-2 border-[#e0dcd4] bg-white p-1">
                  <button type="button" aria-label="Fewer guests" onClick={() => setPartySize((n) => Math.max(1, n - 1))} disabled={partySize <= 1} className="w-11 h-11 rounded-full flex items-center justify-center text-[#0F5D2F] hover:bg-[#0F5D2F]/10 disabled:opacity-30">
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="w-16 text-center text-lg font-black tabular-nums" aria-live="polite">
                    {partySize} <span className="text-xs font-semibold text-[#666]">{partySize === 1 ? "guest" : "guests"}</span>
                  </span>
                  <button type="button" aria-label="More guests" onClick={() => setPartySize((n) => Math.min(maxParty, n + 1))} disabled={partySize >= maxParty} className="w-11 h-11 rounded-full flex items-center justify-center text-[#0F5D2F] hover:bg-[#0F5D2F]/10 disabled:opacity-30">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {[2, 4, 6, 8].filter((n) => n <= maxParty).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPartySize(n)}
                      className={`w-11 h-11 rounded-full border-2 text-sm font-bold ${partySize === n ? "border-[#0F5D2F] bg-[#0F5D2F] text-white" : "border-[#e0dcd4] bg-white text-[#222] hover:border-[#0F5D2F]/50"}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-[#888] mt-2">
                More than {maxParty} people? Call us{settings?.restaurant.phone ? ` at ${settings.restaurant.phone}` : ""} for group bookings.
              </p>
            </FormSection>

            <FormSection title="Pick a date" step={2}>
              {datesQuery.isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-[#0F5D2F]" />
              ) : datesQuery.isError && !datesQuery.data ? (
                <LoadError what="the available dates" onRetry={() => datesQuery.refetch()} retrying={datesQuery.isFetching} />
              ) : datesQuery.data && datesQuery.data.dates.length === 0 ? (
                <p className="text-sm text-[#555]">There are no tables available online for {partySize} guests in the next few weeks. Please call us.</p>
              ) : (
                datesQuery.data && (
                  <div className={`flex flex-col sm:flex-row gap-5 items-start transition-opacity ${datesQuery.isPlaceholderData ? "opacity-60" : ""}`}>
                    <MonthCalendar
                      value={date}
                      onChange={(d) => {
                        setDate(d);
                        setTime(null);
                      }}
                      isEnabled={(d) => allowedDates.has(d)}
                      minDate={datesQuery.data.today}
                      maxDate={datesQuery.data.lastDay}
                      today={datesQuery.data.today}
                    />
                    <p className="text-sm text-[#666] sm:pt-2">
                      {date ? (
                        <>
                          You picked <strong className="text-[#222]">{formatDate(date)}</strong>.
                        </>
                      ) : (
                        "Days that are crossed out are fully booked or closed for reservations."
                      )}
                    </p>
                  </div>
                )
              )}
            </FormSection>

            {date && (
              <FormSection title="Pick a time" step={3} color="#F4AA1C">
                {slotsQuery.isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[#0F5D2F]" />
                ) : slotsQuery.isError && !slotsQuery.data ? (
                  <LoadError what="the available times" onRetry={() => slotsQuery.refetch()} retrying={slotsQuery.isFetching} />
                ) : slotsQuery.data?.closedReason ? (
                  <p className="text-sm text-[#555]">{slotsQuery.data.closedReason}</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2" role="radiogroup" aria-label="Time">
                    {slotsQuery.data?.slots.map((s) => (
                      <button
                        key={s.time}
                        type="button"
                        role="radio"
                        aria-checked={time === s.time}
                        disabled={!s.available}
                        onClick={() => setTime(s.time)}
                        className={`min-h-12 rounded-xl border-2 text-sm font-bold transition-colors ${
                          time === s.time
                            ? "border-[#0F5D2F] bg-[#0F5D2F] text-white"
                            : s.available
                              ? "border-[#e0dcd4] bg-white text-[#222] hover:border-[#0F5D2F]/50"
                              : "border-[#eee] bg-[#f3f1ec] text-[#bbb] cursor-not-allowed"
                        }`}
                      >
                        {formatTime(s.time)}
                        {!s.available && <span className="block text-[9px] uppercase tracking-wider">Full</span>}
                      </button>
                    ))}
                  </div>
                )}
              </FormSection>
            )}

            {date && time && (
              <FormSection title="Your details" step={4} color="#A71F29">
                <div className="grid sm:grid-cols-2 gap-x-4">
                  <Field label="Your name" required>
                    <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={80} />
                  </Field>
                  <Field label="Phone number" required>
                    <input className={inputClass} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required maxLength={30} />
                  </Field>
                </div>
                <Field label="Email" hint="Optional">
                  <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={120} />
                </Field>
                <Field label="Anything we should know?" hint="Birthday, high chair, allergies, seating preference…">
                  <textarea className={`${inputClass} min-h-20 resize-y`} value={comments} onChange={(e) => setComments(e.target.value)} maxLength={500} />
                </Field>

                <div className="bg-white border-2 border-[#0F5D2F] rounded-2xl px-5 py-4 mb-5 text-sm">
                  <p className="font-bold text-[#0F5D2F] uppercase tracking-wide text-xs mb-1">Your request</p>
                  <p className="text-[#222]">
                    <strong>{partySize} {partySize === 1 ? "guest" : "guests"}</strong> on <strong>{formatDate(date)}</strong> at <strong>{formatTime(time)}</strong>
                  </p>
                  {!settings?.reservations.autoApprove && (
                    <p className="text-xs text-[#666] mt-1">Our team will confirm your reservation shortly — you can follow its status online.</p>
                  )}
                </div>

                {error && <ErrorBox>{error}</ErrorBox>}
                <div className="text-center">
                  <PrimaryButton type="submit" disabled={submitting} className="w-full sm:w-auto">
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                      </>
                    ) : settings?.reservations.autoApprove ? (
                      "Book table"
                    ) : (
                      "Request reservation"
                    )}
                  </PrimaryButton>
                </div>
              </FormSection>
            )}
            {error && !(date && time) && <ErrorBox>{error}</ErrorBox>}
          </form>
        )}

        <div className="mt-6">
          <FindReservation />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
