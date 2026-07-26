import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { menuItemsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { menuData } from "../data/menuSeed";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function formatItem(item: any) {
  return {
    ...item,
    price: parseFloat(item.price ?? "0"),
  };
}

// Seed from static data if table is empty
async function ensureSeeded() {
  const existing = await db.select().from(menuItemsTable).limit(1);
  if (existing.length > 0) return;

  const rows: any[] = [];
  menuData.forEach((section, sectionIdx) => {
    section.items.forEach((item, itemIdx) => {
      rows.push({
        category: section.category,
        sortOrder: sectionIdx * 100 + itemIdx,
        name: item.name,
        description: item.desc ?? null,
        price: item.price.toFixed(2),
        note: item.note ?? null,
        callout: section.callout ?? null,
        boost: section.boost ?? null,
        isNew: item.isNew ?? false,
        isAvailable: true,
      });
    });
  });

  await db.insert(menuItemsTable).values(rows);
}

// GET /menu-items — list all items (public)
router.get("/menu-items", async (_req, res) => {
  await ensureSeeded();
  const items = await db
    .select()
    .from(menuItemsTable)
    .orderBy(asc(menuItemsTable.sortOrder), asc(menuItemsTable.id));
  return res.json({ items: items.map(formatItem) });
});

// PUT /menu-items/:id — update a menu item (admin only)
router.put("/menu-items/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description, price, note, callout, boost, isNew, isAvailable, category } = req.body;

  const updates: any = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (price !== undefined) updates.price = parseFloat(price).toFixed(2);
  if (note !== undefined) updates.note = note;
  if (callout !== undefined) updates.callout = callout;
  if (boost !== undefined) updates.boost = boost;
  if (isNew !== undefined) updates.isNew = isNew;
  if (isAvailable !== undefined) updates.isAvailable = isAvailable;
  if (category !== undefined) updates.category = category;

  const [updated] = await db
    .update(menuItemsTable)
    .set(updates)
    .where(eq(menuItemsTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Item not found" });
  return res.json(formatItem(updated));
});

// POST /menu-items — create a new item (admin only)
router.post("/menu-items", requireAdmin, async (req, res) => {
  const { name, description, price, note, callout, boost, isNew, isAvailable, category, sortOrder } = req.body;
  if (!name || price == null || !category) {
    return res.status(400).json({ error: "name, price, and category are required" });
  }

  const [item] = await db.insert(menuItemsTable).values({
    name,
    description: description ?? null,
    price: parseFloat(price).toFixed(2),
    note: note ?? null,
    callout: callout ?? null,
    boost: boost ?? null,
    isNew: isNew ?? false,
    isAvailable: isAvailable ?? true,
    category,
    sortOrder: sortOrder ?? 9999,
  }).returning();

  return res.status(201).json(formatItem(item));
});

// DELETE /menu-items/:id (admin only)
router.delete("/menu-items/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(menuItemsTable).where(eq(menuItemsTable.id, id));
  return res.json({ success: true });
});

export default router;
