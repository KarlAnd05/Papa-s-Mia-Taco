import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, customersTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// POST /orders — create an order (with items), optionally linked to a customer
router.post("/orders", requireAdmin, async (req, res) => {
  const { customerId, items, notes, status = "completed" } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "At least one item is required" });
  }
  for (const it of items) {
    if (!it.itemName || !it.quantity || it.quantity < 1 || it.unitPrice == null) {
      return res.status(400).json({ error: "Each item needs itemName, quantity ≥ 1, and unitPrice" });
    }
  }

  const totalAmount = items.reduce(
    (sum: number, it: any) => sum + it.quantity * parseFloat(it.unitPrice),
    0
  );

  const result = await db.transaction(async (tx) => {
    // Create the order
    const [order] = await tx.insert(ordersTable).values({
      customerId: customerId ?? null,
      status,
      totalAmount: totalAmount.toFixed(2),
      notes: notes || null,
    }).returning();

    // Create order items
    const orderItems = await tx.insert(orderItemsTable).values(
      items.map((it: any) => ({
        orderId: order.id,
        itemName: it.itemName,
        itemCategory: it.itemCategory || "Other",
        quantity: it.quantity,
        unitPrice: parseFloat(it.unitPrice).toFixed(2),
        lineTotal: (it.quantity * parseFloat(it.unitPrice)).toFixed(2),
      }))
    ).returning();

    // Update customer stats if linked
    if (customerId) {
      const [customer] = await tx.select().from(customersTable).where(eq(customersTable.id, customerId));
      if (customer) {
        const newTotal = parseFloat(customer.totalSpent ?? "0") + totalAmount;
        const newOrders = (customer.totalOrders ?? 0) + 1;
        const newAvg = newTotal / newOrders;
        const pointsEarned = Math.floor(totalAmount * 5); // 5 pts per $1
        const newPoints = (customer.loyaltyPoints ?? 0) + pointsEarned;
        const newTier =
          newPoints >= 5000 ? "platinum" :
          newPoints >= 2000 ? "gold" :
          newPoints >= 800  ? "silver" : "bronze";

        await tx.update(customersTable).set({
          totalOrders: newOrders,
          totalSpent: newTotal.toFixed(2),
          averageOrderValue: newAvg.toFixed(2),
          loyaltyPoints: newPoints,
          loyaltyTier: newTier,
          lastVisitDate: new Date(),
          firstVisitDate: customer.firstVisitDate ?? new Date(),
          updatedAt: new Date(),
        }).where(eq(customersTable.id, customerId));
      }
    }

    return { order, orderItems };
  });

  return res.status(201).json(formatOrder(result.order, result.orderItems));
});

// GET /orders — list all orders, most recent first
router.get("/orders", requireAdmin, async (req, res) => {
  const page = parseInt(String(req.query.page ?? "1"));
  const limit = parseInt(String(req.query.limit ?? "20"));
  const offset = (page - 1) * limit;

  const orders = await db
    .select({
      order: ordersTable,
      customer: {
        id: customersTable.id,
        name: customersTable.name,
        email: customersTable.email,
        phone: customersTable.phone,
      },
    })
    .from(ordersTable)
    .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
    .orderBy(desc(ordersTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(ordersTable);

  return res.json({
    orders: orders.map(({ order, customer }) => ({
      ...formatOrder(order),
      customer: customer?.id ? customer : null,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /orders/:id — single order with items
router.get("/orders/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) return res.status(404).json({ error: "Order not found" });

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));

  let customer = null;
  if (order.customerId) {
    const [c] = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId));
    if (c) customer = { id: c.id, name: c.name, email: c.email, phone: c.phone };
  }

  return res.json({ ...formatOrder(order, items), customer });
});

// GET /customers/:id/orders — all orders for a customer
router.get("/customers/:id/orders", requireAdmin, async (req, res) => {
  const customerId = parseInt(req.params.id);
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.customerId, customerId))
    .orderBy(desc(ordersTable.createdAt));

  const withItems = await Promise.all(
    orders.map(async (order) => {
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
      return formatOrder(order, items);
    })
  );

  return res.json({ orders: withItems, total: withItems.length });
});

function formatOrder(order: any, items?: any[]) {
  return {
    ...order,
    totalAmount: parseFloat(order.totalAmount ?? "0"),
    createdAt: order.createdAt?.toISOString?.() ?? order.createdAt,
    items: (items ?? []).map((it) => ({
      ...it,
      unitPrice: parseFloat(it.unitPrice ?? "0"),
      lineTotal: parseFloat(it.lineTotal ?? "0"),
    })),
  };
}

export default router;
