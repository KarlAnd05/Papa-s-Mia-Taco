import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

// Key/value store for restaurant settings managed from the admin panel
// (restaurant info, ordering, tax, reservation rules) and one-off data migration flags.
export const appSettingsTable = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AppSetting = typeof appSettingsTable.$inferSelect;
