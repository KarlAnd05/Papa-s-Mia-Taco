import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { customersTable } from "./customers";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customersTable.id, { onDelete: "set null" }),
  status: text("status").notNull().default("completed"),  // pending | completed | cancelled
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  itemName: text("item_name").notNull(),
  itemCategory: text("item_category").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
});

export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
