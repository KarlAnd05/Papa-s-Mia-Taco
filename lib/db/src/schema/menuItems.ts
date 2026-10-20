import { pgTable, serial, text, numeric, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

// Choices a customer/cashier picks when ordering an item (sizes, add-ons, sauces…).
// "single" groups allow one choice, "multiple" groups allow any number. Prices are added to the item price.
export type MenuOptionChoice = { id: string; name: string; price: number };
export type MenuOptionGroup = {
  id: string;
  name: string;
  type: "single" | "multiple";
  required: boolean;
  choices: MenuOptionChoice[];
};

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
  options: jsonb("options").$type<MenuOptionGroup[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MenuItem = typeof menuItemsTable.$inferSelect;
export type MenuItemInsert = typeof menuItemsTable.$inferInsert;
