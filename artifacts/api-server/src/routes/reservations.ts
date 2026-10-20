import { Router } from "express";
import { z } from "zod/v4";
import { eq } from "drizzle-orm";
import { db, reservationsTable } from "@workspace/db";
import { getBookableDates, getDayAvailability, lockSlot } from "../lib/availability";
import { HttpError, dateField, optionalEmail, optionalText, parse, phoneField, samePhone, timeField } from "../lib/http";
import { limitByIp, RateLimiter } from "../lib/rateLimit";
import { publicReservation, updateReservation } from "../lib/reservations";
import { getSettings } from "../lib/settings";
import { addDays, zonedNow } from "../lib/time";
import { randomToken, shortCode } from "../lib/tokens";

// Public reservation endpoints used by the customer website.
const router = Router();

const bookingLimiter = new RateLimiter(10, 60 * 60 * 1000);
const lookupLimiter = new RateLimiter(20, 15 * 60 * 1000);

const datesQuery = z.object({
  from: dateField.optional(),
  to: dateField.optional(),
  partySize: z.coerce.number().int().min(1).max(100).default(1),
});

// Which dates can be booked (used to disable days in the calendar)
router.get("/reservations/dates", async (req, res) => {
  const query = parse(datesQuery, req.query);
  const settings = await getSettings();
  const today = zonedNow(settings.restaurant.timezone).date;
  const lastDay = addDays(today, settings.reservations.bookingWindowDays);
  const from = query.from && query.from > today ? query.from : today;
  const to = query.to && query.to < lastDay ? query.to : lastDay;
  const dates = from <= to ? await getBookableDates(db, from, to, query.partySize, settings) : [];
  res.json({
    today,
    lastDay,
    maxPartySize: settings.reservations.maxPartySize,
    enabled: settings.reservations.enabled,
    dates,
  });
});

const availabilityQuery = z.object({
  date: dateField,
  partySize: z.coerce.number().int().min(1).max(100).default(1),
});

router.get("/reservations/availability", async (req, res) => {
  const { date, partySize } = parse(availabilityQuery, req.query);
  const settings = await getSettings();
  const day = await getDayAvailability(db, date, settings);
  res.json({
    date,
    closedReason: day.closedReason,
    slots: day.slots
      .filter((s) => s.isActive && !s.blocked)
      .map((s) => ({ time: s.time, available: s.bookable && s.remaining >= partySize })),
  });
});

const bookingBody = z.object({
  date: dateField,
  time: timeField,
  partySize: z.number().int().min(1),
  name: z.string().trim().min(1, "Please enter your name").max(80),
  phone: phoneField,
  email: optionalEmail,
  comments: optionalText(500),
});

router.post(
  "/reservations",
  limitByIp(bookingLimiter, "Too many reservation requests. Please call us instead."),
  async (req, res) => {
    const body = parse(bookingBody, req.body);
    const settings = await getSettings();
    if (body.partySize > settings.reservations.maxPartySize) {
      throw new HttpError(
        400,
        `For groups larger than ${settings.reservations.maxPartySize}, please call us at ${settings.restaurant.phone}.`,
      );
    }

    const reservation = await db.transaction(async (tx) => {
      await lockSlot(tx, body.date, body.time);
      const day = await getDayAvailability(tx, body.date, settings);
      if (day.closedReason) throw new HttpError(409, day.closedReason);
      const slot = day.slots.find((s) => s.time === body.time);
      if (!slot || !slot.bookable || slot.remaining < body.partySize) {
        throw new HttpError(
          409,
          `Sorry, ${body.time} is no longer available for ${body.partySize} ${body.partySize === 1 ? "guest" : "guests"}. Please choose another time.`,
        );
      }
      const [created] = await tx
        .insert(reservationsTable)
        .values({
          ...body,
          code: shortCode(),
          accessToken: randomToken(),
          status: settings.reservations.autoApprove ? "approved" : "pending",
        })
        .returning();
      return created;
    });

    res.status(201).json({ token: reservation.accessToken, ...publicReservation(reservation, settings) });
  },
);

async function findByToken(token: string) {
  const [r] = await db.select().from(reservationsTable).where(eq(reservationsTable.accessToken, token));
  if (!r) throw new HttpError(404, "Reservation not found");
  return r;
}

router.get("/reservations/status/:token", async (req, res) => {
  const r = await findByToken(req.params.token);
  res.json(publicReservation(r, await getSettings()));
});

router.post("/reservations/status/:token/cancel", async (req, res) => {
  const r = await findByToken(req.params.token);
  const settings = await getSettings();
  if (!publicReservation(r, settings).canCancel) throw new HttpError(400, "This reservation can no longer be cancelled online");
  const updated = await updateReservation(r.id, { status: "cancelled" });
  res.json(publicReservation(updated!, settings));
});

const lookupBody = z.object({
  code: z.string().trim().min(4).max(12),
  phone: phoneField,
});

// Find a reservation again with its reference code + phone number
router.post("/reservations/lookup", limitByIp(lookupLimiter), async (req, res) => {
  const { code, phone } = parse(lookupBody, req.body);
  const [r] = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.code, code.toUpperCase().replace(/[^A-Z0-9]/g, "")));
  if (!r || !samePhone(r.phone, phone)) {
    throw new HttpError(404, "We couldn't find a reservation with that code and phone number");
  }
  res.json({ token: r.accessToken });
});

export default router;
