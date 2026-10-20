import { count, eq } from "drizzle-orm";
import { db, pool, menuItemsTable, reservationSlotsTable, staffUsersTable } from "@workspace/db";
import { bootstrap } from "./lib/bootstrap";

try {
  await bootstrap({ strict: true });
  const [{ staff }] = await db.select({ staff: count() }).from(staffUsersTable).where(eq(staffUsersTable.isActive, true));
  if (staff === 0) {
    throw new Error("No active staff account. Set ADMIN_USERNAME and ADMIN_PASSWORD (at least 8 characters), then run database setup again.");
  }
  const [{ menu }] = await db.select({ menu: count() }).from(menuItemsTable);
  const [{ slots }] = await db.select({ slots: count() }).from(reservationSlotsTable);
  console.log(`Database ready: ${menu} menu items, ${slots} reservation slots, ${staff} active staff account(s).`);
} catch (err) {
  console.error(err instanceof Error ? err.message : "Database seeding failed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
