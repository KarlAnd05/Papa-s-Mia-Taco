import { pgTable, serial, integer, text, numeric, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { customersTable } from "./customers";
import { menuItemsTable } from "./menuItems";

// Snapshot of the options chosen for an order line (names/prices as they were when ordered).
export type OrderItemOption = { group: string; choice: string; price: number };

// Columns added after the first release are nullable or have defaults so that
// `drizzle-kit push` can apply them to existing data without prompting.
export const ordersTable = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id").references(() => customersTable.id, { onDelete: "set null" }),
    status: text("status").notNull().default("completed"), // pending | preparing | ready | completed | cancelled
    source: text("source").notNull().default("pos"), // pos | online
    orderType: text("order_type"), // dine_in | takeaway | pickup | delivery
    tableLabel: text("table_label"),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    customerEmail: text("customer_email"),
    deliveryAddress: text("delivery_address"),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }),
    discountType: text("discount_type"), // percent | amount
    discountValue: numeric("discount_value", { precision: 10, scale: 2 }),
    discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    discountReason: text("discount_reason"),
    taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0"),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    paymentMethod: text("payment_method"), // cash | card | pay_on_pickup | pay_on_delivery
    amountTendered: numeric("amount_tendered", { precision: 10, scale: 2 }),
    trackingToken: text("tracking_token"), // secret used in the customer status link (online orders)
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    statusUpdatedAt: timestamp("status_updated_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("orders_tracking_token_idx").on(t.trackingToken),
    index("orders_status_idx").on(t.status),
    index("orders_created_at_idx").on(t.createdAt),
  ],
);

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  menuItemId: integer("menu_item_id").references(() => menuItemsTable.id, { onDelete: "set null" }),
  itemName: text("item_name").notNull(),
  itemCategory: text("item_category").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
  options: jsonb("options").$type<OrderItemOption[]>().notNull().default([]),
});

export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
