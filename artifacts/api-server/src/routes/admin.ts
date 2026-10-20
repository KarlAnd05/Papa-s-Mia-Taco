import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, ordersTable, reservationsTable } from "@workspace/db";
import { and, eq, count, sum, avg, gte, inArray, max, ne, sql } from "drizzle-orm";
import { requireStaff } from "../lib/auth";
import { SEAT_HOLDING_STATUSES } from "../lib/availability";
import { createdOnLocalDate } from "../lib/orders";
import { getSettings } from "../lib/settings";
import { zonedNow } from "../lib/time";

const router = Router();
router.use(["/stats", "/admin/notifications"], requireStaff);

// Get stats overview
router.get("/stats/overview", async (req, res) => {
  try {
    const [totals] = await db
      .select({
        totalCustomers: count(),
        totalOrders: sum(customersTable.totalOrders),
        totalRevenue: sum(customersTable.totalSpent),
        avgOrderValue: avg(customersTable.averageOrderValue),
      })
      .from(customersTable);

    const [activeCount] = await db
      .select({ count: count() })
      .from(customersTable)
      .where(eq(customersTable.status, "active"));

    const [vipCount] = await db
      .select({ count: count() })
      .from(customersTable)
      .where(eq(customersTable.status, "vip"));

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const [newThisMonth] = await db
      .select({ count: count() })
      .from(customersTable)
      .where(gte(customersTable.createdAt, startOfMonth));

    const tierCounts = await db
      .select({
        tier: customersTable.loyaltyTier,
        count: count(),
      })
      .from(customersTable)
      .groupBy(customersTable.loyaltyTier);

    const tierBreakdown = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    for (const t of tierCounts) {
      if (t.tier in tierBreakdown) {
        (tierBreakdown as any)[t.tier] = t.count;
      }
    }

    return res.json({
      totalCustomers: totals.totalCustomers ?? 0,
      activeCustomers: activeCount.count ?? 0,
      vipCustomers: vipCount.count ?? 0,
      totalRevenue: parseFloat(totals.totalRevenue?.toString() ?? "0"),
      totalOrders: parseInt(totals.totalOrders?.toString() ?? "0"),
      avgOrderValue: parseFloat(totals.avgOrderValue?.toString() ?? "0"),
      newCustomersThisMonth: newThisMonth.count ?? 0,
      loyaltyTierBreakdown: tierBreakdown,
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to get stats");
    return res.status(500).json({ error: err.message });
  }
});

// Today's activity in the restaurant's timezone
router.get("/stats/today", async (_req, res) => {
  const settings = await getSettings();
  const tz = settings.restaurant.timezone;
  const today = zonedNow(tz).date;

  const [sales] = await db
    .select({ total: sql<string>`coalesce(sum(${ordersTable.totalAmount}), 0)`, orders: count() })
    .from(ordersTable)
    .where(and(eq(ordersTable.status, "completed"), sql`(${ordersTable.completedAt} at time zone ${tz})::date = ${today}::date`));

  const [ordersToday] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(and(ne(ordersTable.status, "cancelled"), createdOnLocalDate(tz, today)));

  const statusCounts = await db
    .select({ status: ordersTable.status, count: count() })
    .from(ordersTable)
    .where(inArray(ordersTable.status, ["pending", "preparing", "ready"]))
    .groupBy(ordersTable.status);
  const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s.count]));

  const [booked] = await db
    .select({ count: count(), guests: sql<number>`coalesce(sum(${reservationsTable.partySize}), 0)::int` })
    .from(reservationsTable)
    .where(and(eq(reservationsTable.date, today), eq(reservationsTable.status, "approved")));

  const [pendingRes] = await db
    .select({ count: count() })
    .from(reservationsTable)
    .where(and(eq(reservationsTable.status, "pending"), gte(reservationsTable.date, today)));

  res.json({
    date: today,
    salesToday: parseFloat(sales.total),
    completedOrdersToday: sales.orders,
    ordersToday: ordersToday.count,
    ordersWaiting: byStatus.pending ?? 0,
    ordersInProgress: (byStatus.preparing ?? 0) + (byStatus.ready ?? 0),
    reservationsToday: booked.count,
    guestsToday: booked.guests,
    pendingReservations: pendingRes.count,
  });
});

// Polled by the admin panel to show badges and alert staff about new online orders/reservations
router.get("/admin/notifications/counts", async (_req, res) => {
  const settings = await getSettings();
  const today = zonedNow(settings.restaurant.timezone).date;

  const [orders] = await db
    .select({ count: count(), latestId: max(ordersTable.id) })
    .from(ordersTable)
    .where(eq(ordersTable.status, "pending"));

  const [reservations] = await db
    .select({ count: count(), latestId: max(reservationsTable.id) })
    .from(reservationsTable)
    .where(and(eq(reservationsTable.status, "pending"), gte(reservationsTable.date, today)));

  const [upcoming] = await db
    .select({ count: count() })
    .from(reservationsTable)
    .where(and(eq(reservationsTable.date, today), inArray(reservationsTable.status, SEAT_HOLDING_STATUSES)));

  res.json({
    newOrders: orders.count,
    latestNewOrderId: orders.latestId ?? 0,
    pendingReservations: reservations.count,
    latestPendingReservationId: reservations.latestId ?? 0,
    reservationsToday: upcoming.count,
  });
});

export default router;
