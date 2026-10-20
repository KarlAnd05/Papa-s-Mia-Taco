import { pgTable, serial, text, boolean, integer, timestamp, index } from "drizzle-orm/pg-core";

// Staff accounts for the admin area (username + password, every account is a full admin).
export const staffUsersTable = pgTable("staff_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(), // always stored lowercase
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Login sessions. Only a SHA-256 hash of the cookie token is stored.
export const staffSessionsTable = pgTable(
  "staff_sessions",
  {
    id: serial("id").primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    staffUserId: integer("staff_user_id")
      .notNull()
      .references(() => staffUsersTable.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("staff_sessions_user_idx").on(t.staffUserId)],
);

export type StaffUser = typeof staffUsersTable.$inferSelect;
export type StaffSession = typeof staffSessionsTable.$inferSelect;
