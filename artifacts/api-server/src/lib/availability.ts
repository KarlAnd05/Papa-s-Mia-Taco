import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { reservationBlocksTable, reservationSlotsTable, reservationsTable, type ReservationSlot } from "@workspace/db";
import type { Executor } from "./http";
import type { Settings } from "./settings";
import { addDays, dayOfWeek, timeToMinutes, zonedNow } from "./time";

// Reservations that hold seats. Pending requests count too, so the restaurant is never overbooked
// while waiting to approve them.
export const SEAT_HOLDING_STATUSES = ["pending", "approved"];

export type SlotAvailability = {
  time: string;
  capacity: number;
  booked: number;
  remaining: number;
  isActive: boolean; // part of the weekly schedule (false = only listed because bookings exist)
  blocked: boolean;
  bookable: boolean; // can a customer book it right now (ignoring party size)
};

export type DayAvailability = {
  date: string;
  closedReason: string | null; // whole day unavailable for customers
  slots: SlotAvailability[];
};

type RangeData = {
  slotsByDay: Map<number, ReservationSlot[]>;
  blocks: { date: string; time: string | null }[];
  booked: Map<string, number>; // "date time" -> guests
};

async function loadRange(q: Executor, from: string, to: string): Promise<RangeData> {
  const slots = await q.select().from(reservationSlotsTable).orderBy(asc(reservationSlotsTable.time));
  const slotsByDay = new Map<number, ReservationSlot[]>();
  for (const s of slots) {
    if (!slotsByDay.has(s.dayOfWeek)) slotsByDay.set(s.dayOfWeek, []);
    slotsByDay.get(s.dayOfWeek)!.push(s);
  }

  const blocks = await q
    .select({ date: reservationBlocksTable.date, time: reservationBlocksTable.time })
    .from(reservationBlocksTable)
    .where(and(gte(reservationBlocksTable.date, from), lte(reservationBlocksTable.date, to)));

  const bookedRows = await q
    .select({
      date: reservationsTable.date,
      time: reservationsTable.time,
      guests: sql<number>`sum(${reservationsTable.partySize})::int`,
    })
    .from(reservationsTable)
    .where(
      and(
        gte(reservationsTable.date, from),
        lte(reservationsTable.date, to),
        inArray(reservationsTable.status, SEAT_HOLDING_STATUSES),
      ),
    )
    .groupBy(reservationsTable.date, reservationsTable.time);
  const booked = new Map(bookedRows.map((r) => [`${r.date} ${r.time}`, r.guests]));

  return { slotsByDay, blocks, booked };
}

function computeDay(date: string, data: RangeData, settings: Settings): DayAvailability {
  const rules = settings.reservations;
  const now = zonedNow(settings.restaurant.timezone);
  const lastBookableDate = addDays(now.date, rules.bookingWindowDays);

  const dayBlocks = data.blocks.filter((b) => b.date === date);
  const wholeDayBlocked = dayBlocks.some((b) => b.time === null);
  const blockedTimes = new Set(dayBlocks.map((b) => b.time).filter(Boolean));

  let closedReason: string | null = null;
  if (!rules.enabled) closedReason = "Online reservations are currently closed";
  else if (date < now.date) closedReason = "This date has passed";
  else if (date > lastBookableDate) closedReason = `Reservations open ${rules.bookingWindowDays} days in advance`;
  else if (wholeDayBlocked) closedReason = "Reservations are not available on this date";

  const template = data.slotsByDay.get(dayOfWeek(date)) ?? [];
  const times = new Map<string, { capacity: number; isActive: boolean }>();
  for (const s of template) times.set(s.time, { capacity: s.capacity, isActive: s.isActive });
  // Include times that have bookings but are no longer in the schedule (so admins still see them)
  for (const key of data.booked.keys()) {
    const [d, t] = key.split(" ");
    if (d === date && !times.has(t)) times.set(t, { capacity: 0, isActive: false });
  }

  const slots = [...times.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, { capacity, isActive }]) => {
      const booked = data.booked.get(`${date} ${time}`) ?? 0;
      const remaining = Math.max(0, capacity - booked);
      const blocked = wholeDayBlocked || blockedTimes.has(time);
      const tooSoon = date === now.date && timeToMinutes(time) < now.minutes + rules.minNoticeMinutes;
      return {
        time,
        capacity,
        booked,
        remaining,
        isActive,
        blocked,
        bookable: !closedReason && isActive && !blocked && !tooSoon && remaining > 0,
      };
    });

  if (!closedReason && !slots.some((s) => s.isActive && !s.blocked)) closedReason = "We're not taking reservations on this day";
  return { date, closedReason, slots };
}

export async function getDayAvailability(q: Executor, date: string, settings: Settings): Promise<DayAvailability> {
  return computeDay(date, await loadRange(q, date, date), settings);
}

// Dates in [from, to] where a party of `partySize` can still book at least one time.
export async function getBookableDates(
  q: Executor,
  from: string,
  to: string,
  partySize: number,
  settings: Settings,
): Promise<string[]> {
  const data = await loadRange(q, from, to);
  const dates: string[] = [];
  for (let d = from, i = 0; d <= to && i < 100; d = addDays(d, 1), i++) {
    const day = computeDay(d, data, settings);
    if (day.slots.some((s) => s.bookable && s.remaining >= partySize)) dates.push(d);
  }
  return dates;
}

// Serialise bookings for the same date+time so two customers can't take the last seats at once.
export async function lockSlot(q: Executor, date: string, time: string): Promise<void> {
  await q.execute(sql`select pg_advisory_xact_lock(hashtext(${`reservation ${date} ${time}`}))`);
}

export async function slotCapacity(q: Executor, date: string, time: string): Promise<number | null> {
  const [slot] = await q
    .select({ capacity: reservationSlotsTable.capacity })
    .from(reservationSlotsTable)
    .where(and(eq(reservationSlotsTable.dayOfWeek, dayOfWeek(date)), eq(reservationSlotsTable.time, time)));
  return slot?.capacity ?? null;
}
