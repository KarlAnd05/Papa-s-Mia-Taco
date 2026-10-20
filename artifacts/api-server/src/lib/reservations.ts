import { eq } from "drizzle-orm";
import { db, reservationsTable, type Reservation } from "@workspace/db";
import type { Settings } from "./settings";
import { timeToMinutes, zonedNow } from "./time";

export const RESERVATION_STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export type ReservationChanges = Partial<
  Pick<Reservation, "status" | "date" | "time" | "partySize" | "name" | "phone" | "email" | "comments" | "adminNote">
>;

// Every change to a reservation (admin approve/reject/edit, customer cancel) goes through here.
// Phase 2 (WhatsApp notifications) can hook status changes in this one place.
export async function updateReservation(id: number, changes: ReservationChanges): Promise<Reservation | undefined> {
  const [updated] = await db
    .update(reservationsTable)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(reservationsTable.id, id))
    .returning();
  return updated;
}

export function isUpcoming(r: Pick<Reservation, "date" | "time">, settings: Settings): boolean {
  const now = zonedNow(settings.restaurant.timezone);
  return r.date > now.date || (r.date === now.date && timeToMinutes(r.time) > now.minutes);
}

// What the customer sees on their status page.
export function publicReservation(r: Reservation, settings: Settings) {
  return {
    code: r.code,
    date: r.date,
    time: r.time,
    partySize: r.partySize,
    name: r.name,
    phone: r.phone,
    email: r.email,
    comments: r.comments,
    status: r.status,
    adminNote: r.adminNote,
    createdAt: r.createdAt.toISOString(),
    canCancel: (r.status === "pending" || r.status === "approved") && isUpcoming(r, settings),
  };
}
