import { eq, sql } from "drizzle-orm";
import { db, orderItemsTable, ordersTable, type Order, type OrderItem } from "@workspace/db";
import { recordCompletedOrder } from "./customerStats";
import { HttpError } from "./http";
import { decimalToNumber, toCents } from "./money";

// Online orders move forward through these steps; POS orders are created already completed.
export const ORDER_FLOW = ["pending", "preparing", "ready", "completed"] as const;
export const ORDER_STATUSES = [...ORDER_FLOW, "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ACTIVE_STATUSES: OrderStatus[] = ["pending", "preparing", "ready"];

export function formatOrderItem(it: OrderItem) {
  return {
    id: it.id,
    menuItemId: it.menuItemId,
    itemName: it.itemName,
    itemCategory: it.itemCategory,
    quantity: it.quantity,
    unitPrice: decimalToNumber(it.unitPrice),
    lineTotal: decimalToNumber(it.lineTotal),
    options: it.options ?? [],
  };
}

export function formatOrder(order: Order, items: OrderItem[] = []) {
  const total = decimalToNumber(order.totalAmount);
  const tendered = order.amountTendered == null ? null : decimalToNumber(order.amountTendered);
  return {
    id: order.id,
    customerId: order.customerId,
    status: order.status,
    source: order.source,
    orderType: order.orderType,
    tableLabel: order.tableLabel,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    deliveryAddress: order.deliveryAddress,
    // Orders from before itemised totals only have a total
    subtotal: order.subtotal == null ? total : decimalToNumber(order.subtotal),
    discountType: order.discountType,
    discountValue: order.discountValue == null ? null : decimalToNumber(order.discountValue),
    discountAmount: decimalToNumber(order.discountAmount),
    discountReason: order.discountReason,
    taxAmount: decimalToNumber(order.taxAmount),
    deliveryFee: decimalToNumber(order.deliveryFee),
    totalAmount: total,
    paymentMethod: order.paymentMethod,
    amountTendered: tendered,
    changeDue: tendered == null ? null : Math.max(0, (toCents(tendered) - toCents(total)) / 100),
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    statusUpdatedAt: order.statusUpdatedAt?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null,
    items: items.map(formatOrderItem),
  };
}

export function canTransition(from: string, to: OrderStatus): boolean {
  if (from === "completed" || from === "cancelled" || from === to) return false;
  if (to === "cancelled") return true;
  return ORDER_FLOW.indexOf(to as (typeof ORDER_FLOW)[number]) > ORDER_FLOW.indexOf(from as (typeof ORDER_FLOW)[number]);
}

// Every order status change goes through here (Phase 2 WhatsApp notifications can hook in).
export async function updateOrderStatus(
  id: number,
  to: OrderStatus,
  opts: { paymentMethod?: "cash" | "card" } = {},
): Promise<Order> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, id)).for("update");
    if (!order) throw new HttpError(404, "Order not found");
    if (!canTransition(order.status, to)) throw new HttpError(409, `Order is already ${order.status}`);

    const now = new Date();
    const [updated] = await tx
      .update(ordersTable)
      .set({
        status: to,
        statusUpdatedAt: now,
        ...(to === "completed" ? { completedAt: now } : {}),
        ...(to === "completed" && opts.paymentMethod ? { paymentMethod: opts.paymentMethod } : {}),
      })
      .where(eq(ordersTable.id, id))
      .returning();

    if (to === "completed" && updated.customerId) {
      await recordCompletedOrder(tx, updated.customerId, toCents(updated.totalAmount));
    }
    return updated;
  });
}

export async function loadOrderItems(orderId: number) {
  return db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId)).orderBy(orderItemsTable.id);
}

// "Today" in the restaurant's timezone, for SQL filters on timestamps
export const createdOnLocalDate = (timeZone: string, date: string) =>
  sql`(${ordersTable.createdAt} at time zone ${timeZone})::date = ${date}::date`;
