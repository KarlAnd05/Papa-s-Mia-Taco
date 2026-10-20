import { Router } from "express";
import { z } from "zod/v4";
import { and, asc, count, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db, reservationBlocksTable, reservationSlotsTable, reservationsTable, type Reservation } from "@workspace/db";
import { requireStaff } from "../lib/auth";
import { getDayAvailability, SEAT_HOLDING_STATUSES, slotCapacity } from "../lib/availability";
import { HttpError, dateField, optionalEmail, optionalText, parse, parseId, phoneField, timeField } from "../lib/http";
import { RESERVATION_STATUSES, updateReservation, type ReservationChanges } from "../lib/reservations";
import { getSettings } from "../lib/settings";
import { zonedNow } from "../lib/time";

const router = Router();
router.use(["/admin/reservations", "/admin/reservation-slots", "/admin/reservation-blocks"], requireStaff);

const formatReservation = (r: Reservation) => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

// ── Reservations ──────────────────────────────────────────────────────────

const listQuery = z.object({
  status: z.enum([...RESERVATION_STATUSES, "all", "upcoming"]).default("all"),
  from: dateField.optional(),
  to: dateField.optional(),
  search: z.string().trim().max(80).optional(),
  sort: z.enum(["date", "created"]).default("date"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

router.get("/admin/reservations", async (req, res) => {
  const q = parse(listQuery, req.query);
  const conditions: SQL[] = [];
  if (q.status === "upcoming") {
    const settings = await getSettings();
    conditions.push(gte(reservationsTable.date, zonedNow(settings.restaurant.timezone).date));
    conditions.push(inArray(reservationsTable.status, SEAT_HOLDING_STATUSES));
  } else if (q.status !== "all") {
    conditions.push(eq(reservationsTable.status, q.status));
  }
  if (q.from) conditions.push(gte(reservationsTable.date, q.from));
  if (q.to) conditions.push(lte(reservationsTable.date, q.to));
  if (q.search) {
    const term = `%${q.search}%`;
    conditions.push(
      or(ilike(reservationsTable.name, term), ilike(reservationsTable.phone, term), ilike(reservationsTable.code, term))!,
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const order =
    q.sort === "created"
      ? [asc(reservationsTable.createdAt)]
      : [asc(reservationsTable.date), asc(reservationsTable.time), asc(reservationsTable.id)];

  const [{ total }] = await db.select({ total: count() }).from(reservationsTable).where(where);
  const rows = await db
    .select()
    .from(reservationsTable)
    .where(where)
    .orderBy(...order)
    .limit(q.limit)
    .offset((q.page - 1) * q.limit);

  res.json({ reservations: rows.map(formatReservation), total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) });
});

// One day: every time slot with booked/capacity, plus that day's reservations
router.get("/admin/reservations/day", async (req, res) => {
  const { date } = parse(z.object({ date: dateField }), req.query);
  const settings = await getSettings();
  const day = await getDayAvailability(db, date, settings);
  const reservations = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.date, date))
    .orderBy(asc(reservationsTable.time), asc(reservationsTable.createdAt));
  const blocks = await db.select().from(reservationBlocksTable).where(eq(reservationBlocksTable.date, date));
  res.json({ ...day, reservations: reservations.map(formatReservation), blocks });
});

const updateBody = z.object({
  status: z.enum(RESERVATION_STATUSES).optional(),
  date: dateField.optional(),
  time: timeField.optional(),
  partySize: z.number().int().min(1).max(500).optional(),
  name: z.string().trim().min(1).max(80).optional(),
  phone: phoneField.optional(),
  email: optionalEmail.optional(),
  comments: optionalText(500).optional(),
  adminNote: optionalText(500).optional(),
});

// Approve / reject / edit. Staff may overbook on purpose; the response warns when they do.
router.patch("/admin/reservations/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const changes = parse(updateBody, req.body) as ReservationChanges;
  const updated = await updateReservation(id, changes);
  if (!updated) throw new HttpError(404, "Reservation not found");

  let warning: string | null = null;
  if (SEAT_HOLDING_STATUSES.includes(updated.status)) {
    const capacity = await slotCapacity(db, updated.date, updated.time);
    const [{ guests }] = await db
      .select({ guests: sql<number>`coalesce(sum(${reservationsTable.partySize}), 0)::int` })
      .from(reservationsTable)
      .where(
        and(
          eq(reservationsTable.date, updated.date),
          eq(reservationsTable.time, updated.time),
          inArray(reservationsTable.status, SEAT_HOLDING_STATUSES),
        ),
      );
    if (capacity === null) warning = `${updated.time} is not one of the scheduled times for that day.`;
    else if (guests > capacity) warning = `${updated.time} on ${updated.date} is now over capacity (${guests}/${capacity} guests).`;
  }
  res.json({ reservation: formatReservation(updated), warning });
});

// ── Weekly time slots ─────────────────────────────────────────────────────

router.get("/admin/reservation-slots", async (_req, res) => {
  const slots = await db
    .select()
    .from(reservationSlotsTable)
    .orderBy(asc(reservationSlotsTable.dayOfWeek), asc(reservationSlotsTable.time));
  res.json({ slots });
});

const daySlotsBody = z.object({
  slots: z
    .array(z.object({ time: timeField, capacity: z.number().int().min(1).max(1000), isActive: z.boolean().default(true) }))
    .max(96)
    .refine((s) => new Set(s.map((x) => x.time)).size === s.length, "Each time can only appear once"),
});

// Replace all time slots for one weekday (0 = Sunday … 6 = Saturday)
router.put("/admin/reservation-slots/:dayOfWeek", async (req, res) => {
  const dow = Number(req.params.dayOfWeek);
  if (!Number.isInteger(dow) || dow < 0 || dow > 6) throw new HttpError(400, "Invalid day of week");
  const { slots } = parse(daySlotsBody, req.body);
  await db.transaction(async (tx) => {
    await tx.delete(reservationSlotsTable).where(eq(reservationSlotsTable.dayOfWeek, dow));
    if (slots.length) await tx.insert(reservationSlotsTable).values(slots.map((s) => ({ ...s, dayOfWeek: dow })));
  });
  const saved = await db
    .select()
    .from(reservationSlotsTable)
    .where(eq(reservationSlotsTable.dayOfWeek, dow))
    .orderBy(asc(reservationSlotsTable.time));
  res.json({ slots: saved });
});

// ── Blocked dates / times ─────────────────────────────────────────────────

router.get("/admin/reservation-blocks", async (_req, res) => {
  const settings = await getSettings();
  const today = zonedNow(settings.restaurant.timezone).date;
  const blocks = await db
    .select()
    .from(reservationBlocksTable)
    .where(gte(reservationBlocksTable.date, today))
    .orderBy(asc(reservationBlocksTable.date), asc(reservationBlocksTable.time));
  res.json({ blocks });
});

const blockBody = z.object({
  date: dateField,
  time: timeField.nullish().transform((v) => v ?? null),
  reason: optionalText(200),
});

router.post("/admin/reservation-blocks", async (req, res) => {
  const body = parse(blockBody, req.body);
  const [block] = await db.insert(reservationBlocksTable).values(body).returning();
  res.status(201).json(block);
});

router.delete("/admin/reservation-blocks/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const [deleted] = await db.delete(reservationBlocksTable).where(eq(reservationBlocksTable.id, id)).returning();
  if (!deleted) throw new HttpError(404, "Block not found");
  res.json({ success: true });
});

export default router;
