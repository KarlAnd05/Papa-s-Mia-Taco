import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban, CalendarDays, Check, ChevronLeft, ChevronRight, Copy, Loader2, Pencil, Phone, Plus, Search, Trash2, Users, Wand2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePublicSettings } from "@/hooks/useMenu";
import { apiFetch, errorMessage } from "@/lib/api";
import { RESERVATION_STATUS_LABELS, formatDate, formatDateTime, formatTime } from "@/lib/format";
import type { Reservation, ReservationStatus, Settings } from "@/lib/types";

// Reservation management: approve/reject requests, see each day by time slot,
// and set the weekly times, capacity and blocked dates.

const STATUS_CLASSES: Record<ReservationStatus, string> = {
  pending: "bg-accent text-accent-foreground",
  approved: "bg-primary text-primary-foreground",
  rejected: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Slot = { id?: number; dayOfWeek?: number; time: string; capacity: number; isActive: boolean };
type DayView = {
  date: string;
  closedReason: string | null;
  slots: { time: string; capacity: number; booked: number; remaining: number; isActive: boolean; blocked: boolean }[];
  reservations: Reservation[];
  blocks: { id: number; date: string; time: string | null; reason: string | null }[];
};
type Block = { id: number; date: string; time: string | null; reason: string | null };

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function useRefreshReservations() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["admin-reservations"] });
    queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats-today"] });
  };
}

// ── Approve / reject / edit ─────────────────────────────────────────────────

function useReservationActions() {
  const { toast } = useToast();
  const refresh = useRefreshReservations();
  return async (r: Reservation, changes: Partial<Reservation>, successTitle: string) => {
    try {
      const res = await apiFetch<{ reservation: Reservation; warning: string | null }>(`/admin/reservations/${r.id}`, {
        method: "PATCH",
        body: changes,
      });
      refresh();
      toast({ title: successTitle, description: res.warning ?? undefined, variant: res.warning ? "destructive" : "default" });
      return true;
    } catch (err) {
      toast({ title: "Couldn't update reservation", description: errorMessage(err), variant: "destructive" });
      return false;
    }
  };
}

function RejectDialog({ reservation, onClose }: { reservation: Reservation | null; onClose: () => void }) {
  const update = useReservationActions();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setNote(""), [reservation]);
  if (!reservation) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-destructive">Decline reservation</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {reservation.name} · {reservation.partySize} guests · {formatDate(reservation.date, { weekday: "short", month: "short", day: "numeric" })} at {formatTime(reservation.time)}
        </p>
        <div className="space-y-2">
          <Label>Message to the customer (optional)</Label>
          <div className="flex flex-wrap gap-1.5">
            {["Sorry, we're fully booked at that time.", "We're closed for a private event that day.", "Please call us to arrange a different time."].map((t) => (
              <button key={t} type="button" onClick={() => setNote(t)} className="text-xs rounded-full border border-border px-2.5 py-1 hover:border-primary">
                {t}
              </button>
            ))}
          </div>
          <textarea className="w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Back</Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              if (await update(reservation, { status: "rejected", adminNote: note || null }, "Reservation declined")) onClose();
              setBusy(false);
            }}
          >
            Decline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ reservation, onClose }: { reservation: Reservation | null; onClose: () => void }) {
  const update = useReservationActions();
  const [form, setForm] = useState<Partial<Reservation>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (reservation) setForm({ ...reservation });
  }, [reservation]);
  if (!reservation) return null;
  const set = <K extends keyof Reservation>(k: K, v: Reservation[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">Edit reservation <span className="font-mono text-base text-muted-foreground">{reservation.code}</span></DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" className="bg-background" value={form.date ?? ""} onChange={(e) => set("date", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Time</Label><Input type="time" step={900} className="bg-background" value={form.time ?? ""} onChange={(e) => set("time", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Guests</Label><Input type="number" min={1} className="bg-background" value={form.partySize ?? 1} onChange={(e) => set("partySize", parseInt(e.target.value) || 1)} /></div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as ReservationStatus)}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{RESERVATION_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Name</Label><Input className="bg-background" value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input className="bg-background" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
          <div className="space-y-1.5 col-span-2"><Label>Email</Label><Input className="bg-background" value={form.email ?? ""} onChange={(e) => set("email", e.target.value || null)} /></div>
          <div className="space-y-1.5 col-span-2">
            <Label>Customer's comments</Label>
            <textarea className="w-full min-h-16 rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.comments ?? ""} onChange={(e) => set("comments", e.target.value || null)} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Message shown to the customer</Label>
            <textarea className="w-full min-h-16 rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.adminNote ?? ""} onChange={(e) => set("adminNote", e.target.value || null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const { date, time, partySize, status, name, phone, email, comments, adminNote } = form;
              if (await update(reservation, { date, time, partySize, status, name, phone, email, comments, adminNote }, "Reservation updated")) onClose();
              setBusy(false);
            }}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReservationRow({ r, onReject, onEdit, compact = false }: {
  r: Reservation;
  onReject: (r: Reservation) => void;
  onEdit: (r: Reservation) => void;
  compact?: boolean;
}) {
  const update = useReservationActions();
  const [busy, setBusy] = useState(false);
  const approve = async () => {
    setBusy(true);
    await update(r, { status: "approved" }, `Reservation for ${r.name} confirmed`);
    setBusy(false);
  };

  return (
    <div className={`bg-card border rounded-xl ${r.status === "pending" ? "border-accent border-2" : "border-border"} ${compact ? "px-3 py-2" : "p-4"}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {!compact && (
          <span className="font-bold text-foreground">
            {formatDate(r.date, { weekday: "short", month: "short", day: "numeric" })} · {formatTime(r.time)}
          </span>
        )}
        <span className="inline-flex items-center gap-1 font-bold text-foreground"><Users className="w-4 h-4 text-primary" />{r.partySize}</span>
        <span className="font-semibold">{r.name}</span>
        <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><Phone className="w-3.5 h-3.5" />{r.phone}</a>
        <Badge className={`${STATUS_CLASSES[r.status]} border-0`}>{RESERVATION_STATUS_LABELS[r.status]}</Badge>
        {!compact && <span className="ml-auto text-xs text-muted-foreground">Requested {formatDateTime(r.createdAt)} · {r.code}</span>}
      </div>
      {r.comments && <p className="text-sm text-foreground mt-1.5 bg-muted/60 rounded px-2 py-1">“{r.comments}”</p>}
      {r.adminNote && <p className="text-xs text-muted-foreground mt-1">Note to customer: {r.adminNote}</p>}
      <div className="flex flex-wrap gap-2 mt-2">
        {r.status === "pending" && (
          <>
            <Button size={compact ? "sm" : "default"} disabled={busy} onClick={approve}><Check className="w-4 h-4 mr-1" /> Approve</Button>
            <Button size={compact ? "sm" : "default"} variant="outline" className="text-destructive" disabled={busy} onClick={() => onReject(r)}><X className="w-4 h-4 mr-1" /> Decline</Button>
          </>
        )}
        <Button size={compact ? "sm" : "default"} variant="ghost" onClick={() => onEdit(r)}><Pencil className="w-4 h-4 mr-1" /> Edit</Button>
      </div>
    </div>
  );
}

// ── Requests tab ────────────────────────────────────────────────────────────

function RequestsTab({ onReject, onEdit }: { onReject: (r: Reservation) => void; onEdit: (r: Reservation) => void }) {
  const [status, setStatus] = useState<"pending" | "upcoming" | "approved" | "rejected" | "cancelled" | "all">("pending");
  const [search, setSearch] = useState("");
  const params = new URLSearchParams({ status, sort: status === "pending" ? "created" : "date", limit: "100" });
  if (search.trim()) params.set("search", search.trim());
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reservations", "list", status, search.trim()],
    queryFn: () => apiFetch<{ reservations: Reservation[]; total: number }>(`/admin/reservations?${params}`),
    refetchInterval: 20_000,
    placeholderData: keepPreviousData,
  });

  const filters = [
    ["pending", "Waiting for approval"],
    ["upcoming", "Upcoming"],
    ["approved", "Confirmed"],
    ["rejected", "Declined"],
    ["cancelled", "Cancelled"],
    ["all", "All"],
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {filters.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setStatus(key)} className={`h-9 px-3.5 rounded-full text-sm font-semibold whitespace-nowrap border-2 ${status === key ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative md:ml-auto md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 bg-card h-9" placeholder="Name, phone or code…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : !data?.reservations.length ? (
        <p className="text-center text-muted-foreground py-16">{status === "pending" ? "No reservation requests waiting. 🎉" : "No reservations found."}</p>
      ) : (
        <div className="space-y-2">
          {data.reservations.map((r) => <ReservationRow key={r.id} r={r} onReject={onReject} onEdit={onEdit} />)}
          {data.total > data.reservations.length && <p className="text-xs text-muted-foreground text-center">Showing the first {data.reservations.length} of {data.total}. Use search to narrow down.</p>}
        </div>
      )}
    </div>
  );
}

// ── Schedule tab (one day by time slot) ─────────────────────────────────────

function ScheduleTab({ onReject, onEdit }: { onReject: (r: Reservation) => void; onEdit: (r: Reservation) => void }) {
  const [date, setDate] = useState(localToday());
  const { toast } = useToast();
  const refresh = useRefreshReservations();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reservations", "day", date],
    queryFn: () => apiFetch<DayView>(`/admin/reservations/day?date=${date}`),
    refetchInterval: 20_000,
    placeholderData: keepPreviousData,
  });

  const holding = (data?.reservations ?? []).filter((r) => r.status === "pending" || r.status === "approved");
  const guests = holding.reduce((s, r) => s + r.partySize, 0);
  const capacity = (data?.slots ?? []).filter((s) => s.isActive && !s.blocked).reduce((s, x) => s + x.capacity, 0);
  const dayBlock = data?.blocks.find((b) => b.time === null);

  const toggleBlock = async (time: string | null) => {
    try {
      const existing = data?.blocks.find((b) => b.time === time);
      if (existing) await apiFetch(`/admin/reservation-blocks/${existing.id}`, { method: "DELETE" });
      else await apiFetch("/admin/reservation-blocks", { body: { date, time, reason: null } });
      refresh();
      toast({ title: existing ? "Unblocked" : time ? `${formatTime(time)} blocked` : "Day blocked for online reservations" });
    } catch (err) {
      toast({ title: "Couldn't update", description: errorMessage(err), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day"><ChevronLeft className="w-4 h-4" /></Button>
        <Input type="date" className="w-44 h-10 bg-card" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setDate(shiftDate(date, 1))} aria-label="Next day"><ChevronRight className="w-4 h-4" /></Button>
        <Button variant="ghost" className="h-10" onClick={() => setDate(localToday())}>Today</Button>
        <h2 className="text-lg font-bold text-foreground ml-1">{formatDate(date)}</h2>
        <Button variant={dayBlock ? "default" : "outline"} className="h-10 ml-auto" onClick={() => toggleBlock(null)}>
          <Ban className="w-4 h-4 mr-2" /> {dayBlock ? "Unblock this day" : "Block whole day"}
        </Button>
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-3"><p className="text-xs text-muted-foreground">Bookings</p><p className="text-2xl font-black">{holding.length}</p></div>
          <div className="bg-card border border-border rounded-xl p-3"><p className="text-xs text-muted-foreground">Guests</p><p className="text-2xl font-black">{guests}</p></div>
          <div className="bg-card border border-border rounded-xl p-3"><p className="text-xs text-muted-foreground">Waiting approval</p><p className="text-2xl font-black text-secondary">{holding.filter((r) => r.status === "pending").length}</p></div>
        </div>
      )}
      {data?.closedReason && <p className="text-sm font-semibold text-destructive bg-destructive/10 rounded-lg px-3 py-2">Customers can't book online: {data.closedReason}</p>}

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : !data?.slots.length ? (
        <p className="text-center text-muted-foreground py-16">No time slots on {DAY_NAMES[new Date(`${date}T12:00:00Z`).getUTCDay()]}s. Add some in the Availability tab.</p>
      ) : (
        <div className="space-y-2">
          {data.slots.map((slot) => {
            const list = data.reservations.filter((r) => r.time === slot.time);
            const pct = slot.capacity ? Math.min(100, Math.round((slot.booked / slot.capacity) * 100)) : 100;
            const bar = pct >= 100 ? "bg-destructive" : pct >= 75 ? "bg-accent" : "bg-primary";
            const timeBlocked = data.blocks.some((b) => b.time === slot.time);
            return (
              <div key={slot.time} className={`bg-card border border-border rounded-xl p-3 ${slot.blocked || !slot.isActive ? "opacity-70" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="w-20 font-black text-foreground">{formatTime(slot.time)}</span>
                  <div className="flex-1">
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden"><div className={`h-full ${bar}`} style={{ width: `${pct}%` }} /></div>
                  </div>
                  <span className="w-24 text-right text-sm font-bold tabular-nums">{slot.booked}/{slot.capacity} guests</span>
                  {slot.blocked && <Badge variant="outline" className="border-destructive text-destructive">Blocked</Badge>}
                  {!slot.isActive && <Badge variant="outline">Off schedule</Badge>}
                  {slot.isActive && !dayBlock && (
                    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => toggleBlock(slot.time)}>
                      {timeBlocked ? "Unblock" : "Block"}
                    </Button>
                  )}
                </div>
                {list.length > 0 && (
                  <div className="mt-2 space-y-1.5 pl-0 sm:pl-[92px]">
                    {list.map((r) => <ReservationRow key={r.id} r={r} onReject={onReject} onEdit={onEdit} compact />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Availability tab (rules, weekly slots, blocked dates) ───────────────────

function BookingRules({ settings }: { settings: Settings }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rules, setRules] = useState(settings.reservations);
  const [busy, setBusy] = useState(false);
  useEffect(() => setRules(settings.reservations), [settings]);

  const save = async () => {
    setBusy(true);
    try {
      const updated = await apiFetch<Settings>("/settings", { method: "PUT", body: { reservations: rules } });
      queryClient.setQueryData(["settings"], updated);
      toast({ title: "Booking rules saved" });
    } catch (err) {
      toast({ title: "Couldn't save", description: errorMessage(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <h3 className="font-bold text-lg">Booking rules</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <span><span className="block font-semibold text-sm">Accept online reservations</span><span className="text-xs text-muted-foreground">Turn off to stop new bookings on the website</span></span>
          <Switch checked={rules.enabled} onCheckedChange={(v) => setRules({ ...rules, enabled: v })} />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <span><span className="block font-semibold text-sm">Confirm automatically</span><span className="text-xs text-muted-foreground">Skip manual approval when there's room</span></span>
          <Switch checked={rules.autoApprove} onCheckedChange={(v) => setRules({ ...rules, autoApprove: v })} />
        </label>
        <div className="space-y-1.5">
          <Label>Largest party bookable online</Label>
          <Input type="number" min={1} max={100} className="bg-background" value={rules.maxPartySize} onChange={(e) => setRules({ ...rules, maxPartySize: parseInt(e.target.value) || 1 })} />
        </div>
        <div className="space-y-1.5">
          <Label>How many days ahead customers can book</Label>
          <Input type="number" min={1} max={365} className="bg-background" value={rules.bookingWindowDays} onChange={(e) => setRules({ ...rules, bookingWindowDays: parseInt(e.target.value) || 1 })} />
        </div>
        <div className="space-y-1.5">
          <Label>Minimum notice (minutes before the booking)</Label>
          <Input type="number" min={0} max={10080} step={15} className="bg-background" value={rules.minNoticeMinutes} onChange={(e) => setRules({ ...rules, minNoticeMinutes: parseInt(e.target.value) || 0 })} />
        </div>
      </div>
      <Button onClick={save} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save rules</Button>
    </div>
  );
}

function WeeklySlots() {
  const { toast } = useToast();
  const refresh = useRefreshReservations();
  const queryClient = useQueryClient();
  const [day, setDay] = useState(new Date().getDay());
  const { data } = useQuery({
    queryKey: ["admin-reservations", "slots"],
    queryFn: () => apiFetch<{ slots: Slot[] }>("/admin/reservation-slots").then((d) => d.slots),
  });
  const [draft, setDraft] = useState<Slot[]>([]);
  const [dirty, setDirty] = useState(false);
  const [gen, setGen] = useState({ from: "12:00", to: "21:00", every: 30, capacity: 20 });
  const [copyTo, setCopyTo] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setDraft(data.filter((s) => s.dayOfWeek === day).map(({ time, capacity, isActive }) => ({ time, capacity, isActive })));
      setDirty(false);
      setCopyTo([]);
    }
  }, [data, day]);

  const edit = (next: Slot[]) => {
    setDraft(next);
    setDirty(true);
  };

  const generate = () => {
    const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    const slots: Slot[] = [];
    for (let m = toMin(gen.from); m <= toMin(gen.to) && slots.length < 96; m += Math.max(5, gen.every)) {
      slots.push({ time: `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`, capacity: gen.capacity, isActive: true });
    }
    edit(slots);
  };

  const save = async () => {
    const sorted = [...draft].sort((a, b) => a.time.localeCompare(b.time));
    if (new Set(sorted.map((s) => s.time)).size !== sorted.length) {
      toast({ title: "Each time can only appear once", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      for (const d of [day, ...copyTo]) {
        await apiFetch(`/admin/reservation-slots/${d}`, { method: "PUT", body: { slots: sorted } });
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-reservations", "slots"] });
      refresh();
      toast({ title: `Saved ${DAY_NAMES[day]}${copyTo.length ? ` and ${copyTo.length} other day(s)` : ""}` });
    } catch (err) {
      toast({ title: "Couldn't save", description: errorMessage(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const countFor = (d: number) => data?.filter((s) => s.dayOfWeek === d && s.isActive).length ?? 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div>
        <h3 className="font-bold text-lg">Weekly time slots</h3>
        <p className="text-sm text-muted-foreground">Times customers can book on each day of the week, and the maximum number of guests per time.</p>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {DAY_NAMES.map((name, i) => (
          <button key={name} type="button" onClick={() => setDay(i)} className={`flex-shrink-0 px-3 py-2 rounded-lg border-2 text-sm font-bold ${day === i ? "bg-primary border-primary text-primary-foreground" : "bg-background border-border"}`}>
            {name.slice(0, 3)} <span className="font-normal opacity-80">({countFor(i)})</span>
          </button>
        ))}
      </div>

      <div className="rounded-lg bg-muted/50 p-3 flex flex-wrap items-end gap-2">
        <div className="space-y-1"><Label className="text-xs">From</Label><Input type="time" className="h-9 w-28 bg-background" value={gen.from} onChange={(e) => setGen({ ...gen, from: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Last seating</Label><Input type="time" className="h-9 w-28 bg-background" value={gen.to} onChange={(e) => setGen({ ...gen, to: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Every (min)</Label><Input type="number" min={5} step={5} className="h-9 w-20 bg-background" value={gen.every} onChange={(e) => setGen({ ...gen, every: parseInt(e.target.value) || 30 })} /></div>
        <div className="space-y-1"><Label className="text-xs">Guests per time</Label><Input type="number" min={1} className="h-9 w-20 bg-background" value={gen.capacity} onChange={(e) => setGen({ ...gen, capacity: parseInt(e.target.value) || 1 })} /></div>
        <Button variant="outline" className="h-9" onClick={generate}><Wand2 className="w-4 h-4 mr-1.5" /> Fill {DAY_NAMES[day]}</Button>
      </div>

      {draft.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reservations on {DAY_NAMES[day]}s. Add times below or use “Fill”.</p>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {draft.map((s, i) => (
            <div key={i} className={`flex items-center gap-2 rounded-lg border border-border p-2 ${s.isActive ? "" : "opacity-60"}`}>
              <Input type="time" className="h-9 w-[110px] bg-background" value={s.time} onChange={(e) => edit(draft.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} aria-label="Time" />
              <Input type="number" min={1} className="h-9 w-16 bg-background" value={s.capacity} onChange={(e) => edit(draft.map((x, j) => (j === i ? { ...x, capacity: parseInt(e.target.value) || 1 } : x)))} aria-label="Guests" />
              <span className="text-xs text-muted-foreground">guests</span>
              <Switch checked={s.isActive} onCheckedChange={(v) => edit(draft.map((x, j) => (j === i ? { ...x, isActive: v } : x)))} aria-label="Bookable" />
              <button type="button" onClick={() => edit(draft.filter((_, j) => j !== i))} className="ml-auto p-1.5 text-muted-foreground hover:text-destructive" aria-label="Remove time"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
      <Button variant="ghost" onClick={() => edit([...draft, { time: draft.length ? draft[draft.length - 1].time : "18:00", capacity: draft[draft.length - 1]?.capacity ?? 20, isActive: true }])}>
        <Plus className="w-4 h-4 mr-1" /> Add a time
      </Button>

      <div className="border-t border-border pt-4 space-y-2">
        <p className="text-sm font-semibold flex items-center gap-1.5"><Copy className="w-4 h-4" /> Also apply to:</p>
        <div className="flex flex-wrap gap-1.5">
          {DAY_NAMES.map((name, i) =>
            i === day ? null : (
              <button
                key={name}
                type="button"
                onClick={() => setCopyTo((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${copyTo.includes(i) ? "bg-primary/10 border-primary text-primary" : "border-border"}`}
              >
                {name}
              </button>
            ),
          )}
        </div>
      </div>
      <Button onClick={save} disabled={busy || (!dirty && copyTo.length === 0)}>
        {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save {DAY_NAMES[day]}{copyTo.length ? ` + ${copyTo.length} day(s)` : ""}
      </Button>
    </div>
  );
}

function BlockedDates() {
  const { toast } = useToast();
  const refresh = useRefreshReservations();
  const { data } = useQuery({
    queryKey: ["admin-reservations", "blocks"],
    queryFn: () => apiFetch<{ blocks: Block[] }>("/admin/reservation-blocks").then((d) => d.blocks),
  });
  const [form, setForm] = useState({ date: "", time: "", reason: "" });

  const add = async () => {
    if (!form.date) return;
    try {
      await apiFetch("/admin/reservation-blocks", { body: { date: form.date, time: form.time || null, reason: form.reason || null } });
      setForm({ date: "", time: "", reason: "" });
      refresh();
      toast({ title: "Blocked" });
    } catch (err) {
      toast({ title: "Couldn't block", description: errorMessage(err), variant: "destructive" });
    }
  };
  const remove = async (id: number) => {
    await apiFetch(`/admin/reservation-blocks/${id}`, { method: "DELETE" }).catch(() => undefined);
    refresh();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div>
        <h3 className="font-bold text-lg">Blocked dates & times</h3>
        <p className="text-sm text-muted-foreground">Holidays, private events or busy evenings. Leave the time empty to block the whole day.</p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1"><Label className="text-xs">Date</Label><Input type="date" className="h-9 w-44 bg-background" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Time (optional)</Label><Input type="time" className="h-9 w-32 bg-background" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
        <div className="space-y-1 flex-1 min-w-48"><Label className="text-xs">Reason (staff only)</Label><Input className="h-9 bg-background" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Private event" /></div>
        <Button className="h-9" onClick={add} disabled={!form.date}><Ban className="w-4 h-4 mr-1.5" /> Block</Button>
      </div>
      {!data?.length ? (
        <p className="text-sm text-muted-foreground">Nothing blocked.</p>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-lg">
          {data.map((b) => (
            <li key={b.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <CalendarDays className="w-4 h-4 text-destructive" />
              <span className="font-semibold">{formatDate(b.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
              <span>{b.time ? formatTime(b.time) : "All day"}</span>
              {b.reason && <span className="text-muted-foreground">· {b.reason}</span>}
              <button type="button" onClick={() => remove(b.id)} className="ml-auto p-1.5 text-muted-foreground hover:text-destructive" aria-label="Remove block"><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export function AdminReservations() {
  const [tab, setTab] = useState<"requests" | "schedule" | "availability">("requests");
  const [rejecting, setRejecting] = useState<Reservation | null>(null);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const { data: settings } = usePublicSettings();
  const { data: pending } = useQuery({
    queryKey: ["admin-reservations", "list", "pending", ""],
    queryFn: () => apiFetch<{ reservations: Reservation[]; total: number }>("/admin/reservations?status=pending&sort=created&limit=100"),
    refetchInterval: 20_000,
  });

  const tabs = useMemo(
    () => [
      { key: "requests" as const, label: "Requests", badge: pending?.total },
      { key: "schedule" as const, label: "By date & time" },
      { key: "availability" as const, label: "Availability" },
    ],
    [pending?.total],
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-1">Reservations</h1>
        <p className="text-muted-foreground">Approve requests, see each day by time slot, and set when customers can book.</p>
      </div>

      <div className="flex gap-2 border-b border-border overflow-x-auto [scrollbar-width:none]">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 border-b-2 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
            {!!t.badge && <span className="min-w-5 h-5 px-1.5 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center">{t.badge}</span>}
          </button>
        ))}
      </div>

      {tab === "requests" && <RequestsTab onReject={setRejecting} onEdit={setEditing} />}
      {tab === "schedule" && <ScheduleTab onReject={setRejecting} onEdit={setEditing} />}
      {tab === "availability" && (
        <div className="space-y-5">
          {settings && <BookingRules settings={settings} />}
          <WeeklySlots />
          <BlockedDates />
        </div>
      )}

      <RejectDialog reservation={rejecting} onClose={() => setRejecting(null)} />
      <EditDialog reservation={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
