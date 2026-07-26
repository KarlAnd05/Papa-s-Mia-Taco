import { pgTable, serial, text, numeric, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const menuItemsTable = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  callout: text("callout"),        // category-level callout (mix & match note)
  boost: text("boost"),            // category-level boost line
  isNew: boolean("is_new").notNull().default(false),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MenuItem = typeof menuItemsTable.$inferSelect;
export type MenuItemInsert = typeof menuItemsTable.$inferInsert;
