import { Router } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { menuItemsTable, type MenuItem } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireStaff } from "../lib/auth";
import { ensureMenuSeeded } from "../lib/bootstrap";
import { HttpError, optionalText, parse, parseId } from "../lib/http";

// The menu database is the single source of truth for the website, online ordering and the POS.
const router = Router();

function formatItem(item: MenuItem) {
  return {
    ...item,
    price: parseFloat(item.price ?? "0"),
    options: item.options ?? [],
  };
}

const optionGroupsSchema = z
  .array(
    z.object({
      id: z.string().trim().min(1).max(60),
      name: z.string().trim().min(1, "Option group name is required").max(60),
      type: z.enum(["single", "multiple"]),
      required: z.boolean(),
      choices: z
        .array(
          z.object({
            id: z.string().trim().min(1).max(60),
            name: z.string().trim().min(1, "Option name is required").max(80),
            price: z.number().min(0).max(1000),
          }),
        )
        .min(1, "Each option group needs at least one choice")
        .max(30),
    }),
  )
  .max(10)
  .refine((groups) => new Set(groups.map((g) => g.id)).size === groups.length, "Option group ids must be unique");

const itemFields = {
  name: z.string().trim().min(1, "Name is required").max(100),
  category: z.string().trim().min(1, "Category is required").max(60),
  description: optionalText(500),
  price: z.coerce.number().min(0).max(10000),
  note: optionalText(200),
  callout: optionalText(200),
  boost: optionalText(300),
  isNew: z.boolean(),
  isAvailable: z.boolean(),
  sortOrder: z.number().int().min(0).max(1_000_000),
  options: optionGroupsSchema,
};

const createBody = z.object({
  ...itemFields,
  isNew: itemFields.isNew.default(false),
  isAvailable: itemFields.isAvailable.default(true),
  sortOrder: itemFields.sortOrder.optional(),
  options: itemFields.options.default([]),
});
const updateBody = z.object(itemFields).partial();

// GET /menu-items — list all items (public)
router.get("/menu-items", async (_req, res) => {
  await ensureMenuSeeded();
  const items = await db
    .select()
    .from(menuItemsTable)
    .orderBy(asc(menuItemsTable.sortOrder), asc(menuItemsTable.id));
  return res.json({ items: items.map(formatItem) });
});

// PUT /menu-items/:id — update a menu item (staff only)
router.put("/menu-items/:id", requireStaff, async (req, res) => {
  const id = parseId(req.params.id);
  const { price, ...rest } = parse(updateBody, req.body);
  const [updated] = await db
    .update(menuItemsTable)
    .set({ ...rest, ...(price !== undefined ? { price: price.toFixed(2) } : {}), updatedAt: new Date() })
    .where(eq(menuItemsTable.id, id))
    .returning();
  if (!updated) throw new HttpError(404, "Item not found");
  return res.json(formatItem(updated));
});

// POST /menu-items — create a new item (staff only)
router.post("/menu-items", requireStaff, async (req, res) => {
  const { price, sortOrder, ...rest } = parse(createBody, req.body);
  const [item] = await db
    .insert(menuItemsTable)
    .values({ ...rest, price: price.toFixed(2), sortOrder: sortOrder ?? 9999 })
    .returning();
  return res.status(201).json(formatItem(item));
});

// DELETE /menu-items/:id (staff only)
router.delete("/menu-items/:id", requireStaff, async (req, res) => {
  const id = parseId(req.params.id);
  await db.delete(menuItemsTable).where(eq(menuItemsTable.id, id));
  return res.json({ success: true });
});

export default router;
