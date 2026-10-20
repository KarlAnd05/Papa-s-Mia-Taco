import { Router } from "express";
import { z } from "zod/v4";
import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, customersTable } from "@workspace/db";
import { requireStaff } from "../lib/auth";
import { recordCompletedOrder } from "../lib/customerStats";
import { HttpError, dateField, optionalText, parse, parseId } from "../lib/http";
import { centsToDecimal, toCents } from "../lib/money";
import {
  ACTIVE_STATUSES,
  createdOnLocalDate,
  formatOrder,
  loadOrderItems,
  ORDER_STATUSES,
  updateOrderStatus,
} from "../lib/orders";
import { computeTotals, discountSchema, orderLinesSchema, priceLines } from "../lib/pricing";
import { getSettings } from "../lib/settings";

// Staff order endpoints: the cashier POS and the order management screen.
const router = Router();
router.use("/orders", requireStaff);
router.use("/customers/:id/orders", requireStaff);

const posOrderBody = z.object({
  orderType: z.enum(["dine_in", "takeaway"]).default("takeaway"),
  tableLabel: optionalText(40),
  customerId: z.number().int().positive().nullish(),
  items: orderLinesSchema,
  discount: discountSchema,
  paymentMethod: z.enum(["cash", "card"]),
  amountTendered: z.number().min(0).max(100000).nullish(),
  notes: optionalText(500),
});

// POST /orders — POS sale: priced from the menu database, paid and closed immediately
router.post("/orders", async (req, res) => {
  const body = parse(posOrderBody, req.body);
  const settings = await getSettings();

  const result = await db.transaction(async (tx) => {
    const lines = await priceLines(tx, body.items);
    const totals = computeTotals({
      subtotalCents: lines.reduce((s, l) => s + l.lineCents, 0),
      discount: body.discount,
      taxRate: settings.tax.rate,
    });

    let tenderedCents: number | null = null;
    if (body.paymentMethod === "cash") {
      tenderedCents = body.amountTendered == null ? totals.totalCents : toCents(body.amountTendered);
      if (tenderedCents < totals.totalCents) throw new HttpError(400, "Cash received is less than the total");
    }

    let customerName: string | null = null;
    if (body.customerId) {
      const [c] = await tx.select({ name: customersTable.name, phone: customersTable.phone }).from(customersTable).where(eq(customersTable.id, body.customerId));
      if (!c) throw new HttpError(400, "Customer not found");
      customerName = c.name;
    }

    const now = new Date();
    const [order] = await tx
      .insert(ordersTable)
      .values({
        customerId: body.customerId ?? null,
        status: "completed",
        source: "pos",
        orderType: body.orderType,
        tableLabel: body.tableLabel,
        customerName,
        subtotal: centsToDecimal(totals.subtotalCents),
        discountType: totals.discountCents ? body.discount!.type : null,
        discountValue: totals.discountCents ? String(body.discount!.value) : null,
        discountAmount: centsToDecimal(totals.discountCents),
        discountReason: totals.discountCents ? body.discount!.reason || null : null,
        taxAmount: centsToDecimal(totals.taxCents),
        totalAmount: centsToDecimal(totals.totalCents),
        paymentMethod: body.paymentMethod,
        amountTendered: tenderedCents == null ? null : centsToDecimal(tenderedCents),
        notes: body.notes,
        statusUpdatedAt: now,
        completedAt: now,
      })
      .returning();

    const items = await tx
      .insert(orderItemsTable)
      .values(
        lines.map((l) => ({
          orderId: order.id,
          menuItemId: l.menuItemId,
          itemName: l.itemName,
          itemCategory: l.itemCategory,
          quantity: l.quantity,
          unitPrice: centsToDecimal(l.unitCents),
          lineTotal: centsToDecimal(l.lineCents),
          options: l.options,
        })),
      )
      .returning();

    if (body.customerId) await recordCompletedOrder(tx, body.customerId, totals.totalCents);
    return { order, items };
  });

  res.status(201).json(formatOrder(result.order, result.items));
});

const listQuery = z.object({
  status: z.enum([...ORDER_STATUSES, "active", "all"]).default("all"),
  source: z.enum(["pos", "online", "all"]).default("all"),
  search: z.string().trim().max(80).optional(),
  date: dateField.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /orders — order management list, most recent first
router.get("/orders", async (req, res) => {
  const q = parse(listQuery, req.query);
  const conditions: SQL[] = [];
  if (q.status === "active") conditions.push(inArray(ordersTable.status, ACTIVE_STATUSES));
  else if (q.status !== "all") conditions.push(eq(ordersTable.status, q.status));
  if (q.source !== "all") conditions.push(eq(ordersTable.source, q.source));
  if (q.date) conditions.push(createdOnLocalDate((await getSettings()).restaurant.timezone, q.date));
  if (q.search) {
    const term = `%${q.search.replace(/^#/, "")}%`;
    conditions.push(
      or(
        ilike(ordersTable.customerName, term),
        ilike(ordersTable.customerPhone, term),
        ilike(customersTable.name, term),
        sql`${ordersTable.id}::text = ${q.search.replace(/^#/, "")}`,
      )!,
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({ order: ordersTable, customer: { id: customersTable.id, name: customersTable.name, phone: customersTable.phone, email: customersTable.email } })
    .from(ordersTable)
    .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
    .where(where)
    .orderBy(desc(ordersTable.createdAt), desc(ordersTable.id))
    .limit(q.limit)
    .offset((q.page - 1) * q.limit);

  const [{ total }] = await db
    .select({ total: count() })
    .from(ordersTable)
    .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
    .where(where);

  const ids = rows.map((r) => r.order.id);
  const items = ids.length ? await db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, ids)) : [];

  res.json({
    orders: rows.map(({ order, customer }) => ({
      ...formatOrder(order, items.filter((i) => i.orderId === order.id)),
      customer: customer?.id ? customer : null,
    })),
    total,
    page: q.page,
    limit: q.limit,
    totalPages: Math.ceil(total / q.limit),
  });
});

// GET /orders/:id — single order with items
router.get("/orders/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) throw new HttpError(404, "Order not found");

  let customer = null;
  if (order.customerId) {
    const [c] = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId));
    if (c) customer = { id: c.id, name: c.name, email: c.email, phone: c.phone };
  }
  res.json({ ...formatOrder(order, await loadOrderItems(id)), customer });
});

const statusBody = z.object({
  status: z.enum(ORDER_STATUSES),
  paymentMethod: z.enum(["cash", "card"]).optional(),
});

// PATCH /orders/:id/status — accept, mark ready, complete or cancel
router.patch("/orders/:id/status", async (req, res) => {
  const id = parseId(req.params.id);
  const { status, paymentMethod } = parse(statusBody, req.body);
  const order = await updateOrderStatus(id, status, { paymentMethod });
  res.json(formatOrder(order, await loadOrderItems(id)));
});

// GET /customers/:id/orders — all orders for a customer
router.get("/customers/:id/orders", async (req, res) => {
  const customerId = parseId(req.params.id);
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.customerId, customerId))
    .orderBy(desc(ordersTable.createdAt));
  const ids = orders.map((o) => o.id);
  const items = ids.length ? await db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, ids)) : [];
  const withItems = orders.map((o) => formatOrder(o, items.filter((i) => i.orderId === o.id)));
  res.json({ orders: withItems, total: withItems.length });
});

export default router;
