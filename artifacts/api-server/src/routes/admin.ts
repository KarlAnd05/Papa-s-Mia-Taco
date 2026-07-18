import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { adminsTable, customersTable } from "@workspace/db";
import { eq, count, sum, avg, gte } from "drizzle-orm";

const router = Router();

export async function isAdmin(clerkUserId: string): Promise<boolean> {
  const [admin] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.clerkUserId, clerkUserId));
  return !!admin;
}

// Get admin me
router.get("/admin/me", async (req, res) => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const adminStatus = await isAdmin(auth.userId);
  if (!adminStatus) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const [adminRecord] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.clerkUserId, auth.userId));

  return res.json({
    clerkUserId: auth.userId,
    email: adminRecord?.email ?? "",
    name: adminRecord?.name ?? null,
    isAdmin: true,
  });
});

// Claim admin (first 2 authenticated users can claim admin)
router.post("/admin/claim", async (req, res) => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Check if already admin
  const already = await isAdmin(auth.userId);
  if (already) {
    return res.json({ success: true, message: "Already an admin" });
  }

  // Count existing admins
  const [{ count: adminCount }] = await db
    .select({ count: count() })
    .from(adminsTable);

  if (adminCount >= 2) {
    return res.status(403).json({ error: "Maximum admin accounts reached" });
  }

  // Claim admin
  await db.insert(adminsTable).values({
    clerkUserId: auth.userId,
    email: req.body.email ?? `admin-${auth.userId}@pmt.local`,
    name: req.body.name ?? null,
  });

  return res.json({ success: true, message: "Admin access granted" });
});

// Get stats overview
router.get("/stats/overview", async (req, res) => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const adminStatus = await isAdmin(auth.userId);
  if (!adminStatus) {
    return res.status(403).json({ error: "Forbidden" });
  }

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

export default router;
