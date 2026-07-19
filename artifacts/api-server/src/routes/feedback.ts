import { Router } from "express";
import { db } from "@workspace/db";
import { feedbackTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

// POST /feedback — public, no auth required
router.post("/feedback", async (req, res) => {
  const {
    name, email, phone, visitDate, itemsOrdered,
    ratingFood, ratingService, ratingAtmosphere, ratingValue, ratingOverall,
    wouldRecommend, comments, improvements,
  } = req.body;

  if (!name) return res.status(400).json({ error: "Name is required" });

  const ratings = [ratingFood, ratingService, ratingAtmosphere, ratingValue, ratingOverall];
  for (const r of ratings) {
    if (typeof r !== "number" || r < 1 || r > 5) {
      return res.status(400).json({ error: "All ratings must be between 1 and 5" });
    }
  }

  const [row] = await db.insert(feedbackTable).values({
    name,
    email: email || null,
    phone: phone || null,
    visitDate: visitDate || null,
    itemsOrdered: itemsOrdered || null,
    ratingFood,
    ratingService,
    ratingAtmosphere,
    ratingValue,
    ratingOverall,
    wouldRecommend: wouldRecommend ?? null,
    comments: comments || null,
    improvements: improvements || null,
  }).returning();

  res.status(201).json({ success: true, id: row.id });
});

// GET /feedback — admin only (simple auth check via Clerk)
router.get("/feedback", async (req, res) => {
  const { auth } = req as any;
  if (!auth?.userId) return res.status(401).json({ error: "Unauthorized" });

  // Check admin table
  const { adminsTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const admin = await db.query.adminsTable.findFirst({
    where: eq(adminsTable.clerkUserId, auth.userId),
  });
  if (!admin) return res.status(403).json({ error: "Admin access required" });

  const rows = await db.select().from(feedbackTable).orderBy(desc(feedbackTable.createdAt));
  res.json({ feedback: rows, total: rows.length });
});

export default router;
