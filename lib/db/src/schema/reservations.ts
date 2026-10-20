import { pgTable, serial, text, integer, boolean, timestamp, date, index, uniqueIndex } from "drizzle-orm/pg-core";

// Weekly template of bookable times. dayOfWeek: 0 = Sunday … 6 = Saturday.
// capacity = maximum number of guests that can be booked into that time slot.
export const reservationSlotsTable = pgTable(
  "reservation_slots",
  {
    id: serial("id").primaryKey(),
    dayOfWeek: integer("day_of_week").notNull(),
    time: text("time").notNull(), // "HH:MM", restaurant local time
    capacity: integer("capacity").notNull(),
    isActive: boolean("is_active").notNull().default(true),
  },
  // An index preserves column order when Drizzle introspects an existing database.
  (t) => [uniqueIndex("reservation_slots_day_time_uq").on(t.dayOfWeek, t.time)],
);

// Dates (time = null) or single time slots on a date that cannot be booked.
export const reservationBlocksTable = pgTable(
  "reservation_blocks",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    time: text("time"),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reservation_blocks_date_idx").on(t.date)],
);

export const reservationsTable = pgTable(
  "reservations",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(), // short reference shown to the customer
    accessToken: text("access_token").notNull().unique(), // secret used in the customer status link
    date: date("date", { mode: "string" }).notNull(),
    time: text("time").notNull(),
    partySize: integer("party_size").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    comments: text("comments"),
    status: text("status").notNull().default("pending"), // pending | approved | rejected | cancelled
    adminNote: text("admin_note"), // message shown to the customer (e.g. reason for rejection)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reservations_date_time_idx").on(t.date, t.time),
    index("reservations_status_idx").on(t.status),
  ],
);

export type ReservationSlot = typeof reservationSlotsTable.$inferSelect;
export type ReservationBlock = typeof reservationBlocksTable.$inferSelect;
export type Reservation = typeof reservationsTable.$inferSelect;
