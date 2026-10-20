import { Router } from "express";
import { z } from "zod/v4";
import { eq } from "drizzle-orm";
import { db, ordersTable, orderItemsTable } from "@workspace/db";
import { findOrCreateCustomerByPhone } from "../lib/customerStats";
import { HttpError, optionalEmail, optionalText, parse, phoneField } from "../lib/http";
import { centsToDecimal, toCents } from "../lib/money";
import { formatOrder, loadOrderItems } from "../lib/orders";
import { computeTotals, orderLinesSchema, priceLines } from "../lib/pricing";
import { limitByIp, RateLimiter } from "../lib/rateLimit";
import { getSettings } from "../lib/settings";
import { randomToken } from "../lib/tokens";

// Customer online ordering (no account needed; payment is made in person).
const router = Router();
const orderLimiter = new RateLimiter(30, 60 * 60 * 1000);

const onlineOrderBody = z
  .object({
    orderType: z.enum(["pickup", "delivery"]),
    customer: z.object({
      name: z.string().trim().min(1, "Please enter your name").max(80),
      phone: phoneField,
      email: optionalEmail,
    }),
    deliveryAddress: optionalText(300),
    items: orderLinesSchema,
    notes: optionalText(500),
  })
  .refine((b) => b.orderType !== "delivery" || !!b.deliveryAddress, {
    message: "Please enter a delivery address",
    path: ["deliveryAddress"],
  });

router.post(
  "/public/orders",
  limitByIp(orderLimiter, "Too many orders from this connection. Please call us to order."),
  async (req, res) => {
    const body = parse(onlineOrderBody, req.body);
    const settings = await getSettings();
    const ordering = settings.ordering;
    if (!ordering.enabled) throw new HttpError(403, "Online ordering is paused right now. Please try again later.");
    if (body.orderType === "pickup" && !ordering.pickupEnabled) throw new HttpError(400, "Pickup is not available right now");
    if (body.orderType === "delivery" && !ordering.deliveryEnabled) throw new HttpError(400, "Delivery is not available right now");

    const result = await db.transaction(async (tx) => {
      const lines = await priceLines(tx, body.items);
      const subtotalCents = lines.reduce((s, l) => s + l.lineCents, 0);
      if (subtotalCents < toCents(ordering.minimumOrder)) {
        throw new HttpError(400, `The minimum order is $${ordering.minimumOrder.toFixed(2)}`);
      }
      const totals = computeTotals({
        subtotalCents,
        taxRate: settings.tax.rate,
        deliveryFeeCents: body.orderType === "delivery" ? toCents(ordering.deliveryFee) : 0,
      });

      const customerId = await findOrCreateCustomerByPhone(tx, body.customer);
      const now = new Date();
      const [order] = await tx
        .insert(ordersTable)
        .values({
          customerId,
          status: "pending",
          source: "online",
          orderType: body.orderType,
          customerName: body.customer.name,
          customerPhone: body.customer.phone,
          customerEmail: body.customer.email,
          deliveryAddress: body.orderType === "delivery" ? body.deliveryAddress : null,
          subtotal: centsToDecimal(totals.subtotalCents),
          taxAmount: centsToDecimal(totals.taxCents),
          deliveryFee: centsToDecimal(totals.deliveryFeeCents),
          totalAmount: centsToDecimal(totals.totalCents),
          paymentMethod: body.orderType === "delivery" ? "pay_on_delivery" : "pay_on_pickup",
          trackingToken: randomToken(),
          notes: body.notes,
          statusUpdatedAt: now,
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
      return { order, items };
    });

    res.status(201).json({ token: result.order.trackingToken, ...publicOrder(result.order, result.items, settings) });
  },
);

function publicOrder(
  order: typeof ordersTable.$inferSelect,
  items: (typeof orderItemsTable.$inferSelect)[],
  settings: Awaited<ReturnType<typeof getSettings>>,
) {
  const { customerId: _customerId, ...rest } = formatOrder(order, items);
  return {
    ...rest,
    estimatedMinutes: order.orderType === "delivery" ? settings.ordering.deliveryMinutes : settings.ordering.pickupMinutes,
  };
}

// Customer order status / invoice page
router.get("/public/orders/:token", async (req, res) => {
  const token = req.params.token;
  if (!token || token.length < 20) throw new HttpError(404, "Order not found");
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.trackingToken, token));
  if (!order) throw new HttpError(404, "Order not found");
  res.json(publicOrder(order, await loadOrderItems(order.id), await getSettings()));
});

export default router;
