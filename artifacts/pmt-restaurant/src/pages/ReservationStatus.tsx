import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, CalendarClock, CalendarX, Loader2 } from "lucide-react";
import { usePublicSettings } from "@/hooks/useMenu";
import { apiFetch, errorMessage } from "@/lib/api";
import { RESERVATION_STATUS_LABELS, formatDate, formatTime } from "@/lib/format";
import type { PublicReservation, ReservationStatus as Status } from "@/lib/types";
import { ErrorBox } from "@/components/site/form";
import { PageHeader } from "@/components/site/PageHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNavbar } from "@/components/site/SiteNavbar";

const STATUS_STYLE: Record<Status, { bg: string; fg: string; icon: React.ReactNode; message: string }> = {
  pending: {
    bg: "#F4AA1C",
    fg: "#222",
    icon: <CalendarClock className="w-7 h-7 flex-shrink-0" />,
    message: "We've received your request. Our team will confirm it shortly — this page updates automatically.",
  },
  approved: {
    bg: "#0F5D2F",
    fg: "#fff",
    icon: <CalendarCheck className="w-7 h-7 flex-shrink-0" />,
    message: "Your table is booked. See you soon!",
  },
  rejected: {
    bg: "#A71F29",
    fg: "#fff",
    icon: <CalendarX className="w-7 h-7 flex-shrink-0" />,
    message: "Sorry, we couldn't confirm this reservation.",
  },
  cancelled: {
    bg: "#666",
    fg: "#fff",
    icon: <CalendarX className="w-7 h-7 flex-shrink-0" />,
    message: "This reservation was cancelled.",
  },
};

export default function ReservationStatus() {
  const { token } = useParams<{ token: string }>();
  const { data: settings } = usePublicSettings();
  const queryClient = useQueryClient();
  const queryKey = ["public-reservation", token];
  const { data: r, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => apiFetch<PublicReservation>(`/reservations/status/${token}`),
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 30_000 : false),
    refetchOnWindowFocus: true,
  });
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const cancel = async () => {
    setCancelling(true);
    setCancelError("");
    try {
      const updated = await apiFetch<PublicReservation>(`/reservations/status/${token}/cancel`, { method: "POST" });
      queryClient.setQueryData(queryKey, updated);
      setConfirmCancel(false);
    } catch (err) {
      setCancelError(errorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const style = r ? STATUS_STYLE[r.status] : null;

  return (
    <div className="min-h-screen bg-[#F8F5EF] text-[#222] font-sans">
      <SiteNavbar />
      <PageHeader eyebrow="Your reservation" title={r ? RESERVATION_STATUS_LABELS[r.status] : "Reservation"} color="#A71F29" />

      <div className="max-w-xl mx-auto px-4 sm:px-6 pb-24">
        {isLoading && <Loader2 className="w-8 h-8 animate-spin text-[#0F5D2F] mx-auto my-16" />}
        {error && !r && (
          <div className="text-center py-12">
            <p className="text-[#A71F29] font-semibold mb-6">We couldn't find this reservation.</p>
            <Link href="/reservations" className="text-[#0F5D2F] font-bold underline">Back to reservations</Link>
          </div>
        )}

        {r && style && (
          <>
            <div className="rounded-2xl px-6 py-5 mb-6 flex items-start gap-4 shadow-md" style={{ background: style.bg, color: style.fg }}>
              {style.icon}
              <div>
                <p className="font-black uppercase tracking-wider text-sm">{RESERVATION_STATUS_LABELS[r.status]}</p>
                <p className="text-sm mt-1 opacity-95">{style.message}</p>
                {r.adminNote && <p className="text-sm mt-2 font-semibold">Message from the restaurant: “{r.adminNote}”</p>}
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-[#eee] divide-y divide-[#eee] mb-6">
              <div className="px-5 py-4 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#666]">Reference</span>
                <span className="font-mono text-xl font-black tracking-[0.2em] text-[#0F5D2F]">{r.code}</span>
              </div>
              <dl className="px-5 py-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-[#666]">Date</dt>
                <dd className="font-bold">{formatDate(r.date)}</dd>
                <dt className="text-[#666]">Time</dt>
                <dd className="font-bold">{formatTime(r.time)}</dd>
                <dt className="text-[#666]">Guests</dt>
                <dd className="font-bold">{r.partySize}</dd>
                <dt className="text-[#666]">Name</dt>
                <dd>{r.name}</dd>
                <dt className="text-[#666]">Phone</dt>
                <dd>{r.phone}</dd>
                {r.comments && (
                  <>
                    <dt className="text-[#666]">Notes</dt>
                    <dd>{r.comments}</dd>
                  </>
                )}
              </dl>
            </div>

            <p className="text-xs text-[#888] text-center mb-6">
              Bookmark this page, or use your reference <strong>{r.code}</strong> and phone number to find it again.
              {settings?.restaurant.phone && <> Need to change something? Call us at {settings.restaurant.phone}.</>}
            </p>

            {cancelError && <ErrorBox>{cancelError}</ErrorBox>}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {r.canCancel &&
                (confirmCancel ? (
                  <div className="flex gap-2 items-center justify-center">
                    <span className="text-sm font-semibold">Cancel this reservation?</span>
                    <button type="button" onClick={cancel} disabled={cancelling} className="min-h-11 px-5 rounded-full bg-[#A71F29] text-white text-sm font-bold uppercase tracking-wider disabled:opacity-50">
                      {cancelling ? "…" : "Yes, cancel"}
                    </button>
                    <button type="button" onClick={() => setConfirmCancel(false)} className="min-h-11 px-4 rounded-full border-2 border-[#e0dcd4] text-sm font-bold">
                      Keep it
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmCancel(true)} className="min-h-12 px-6 rounded-full border-2 border-[#A71F29] text-[#A71F29] font-bold uppercase tracking-wider text-sm hover:bg-[#A71F29] hover:text-white transition-colors">
                    Cancel reservation
                  </button>
                ))}
              <Link href="/reservations" className="inline-flex items-center justify-center min-h-12 px-6 rounded-full bg-[#0F5D2F] text-white font-bold uppercase tracking-wider text-sm hover:bg-[#0F5D2F]/90 transition-colors">
                {r.status === "rejected" || r.status === "cancelled" ? "Book another time" : "Book another table"}
              </Link>
            </div>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
