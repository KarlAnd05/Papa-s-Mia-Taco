// Create a staff account, or reset its password if it already exists (it is also re-activated).
// Usage: pnpm --filter @workspace/scripts run create-admin -- <username> <password> ["Display Name"]
import { eq } from "drizzle-orm";
import { db, pool, staffSessionsTable, staffUsersTable } from "@workspace/db";
import { hashPassword, PASSWORD_MIN_LENGTH } from "@workspace/db/password";

const [rawUsername, password, displayName] = process.argv.slice(2).filter((a) => a !== "--");

if (!rawUsername || !password) {
  console.error('Usage: pnpm --filter @workspace/scripts run create-admin -- <username> <password> ["Display Name"]');
  process.exit(1);
}
if (password.length < PASSWORD_MIN_LENGTH) {
  console.error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  process.exit(1);
}

const username = rawUsername.trim().toLowerCase();
const passwordHash = await hashPassword(password);
const [existing] = await db.select().from(staffUsersTable).where(eq(staffUsersTable.username, username));

if (existing) {
  await db
    .update(staffUsersTable)
    .set({ passwordHash, isActive: true, ...(displayName ? { displayName } : {}), updatedAt: new Date() })
    .where(eq(staffUsersTable.id, existing.id));
  await db.delete(staffSessionsTable).where(eq(staffSessionsTable.staffUserId, existing.id));
  console.log(`Password reset for "${username}". Existing sessions were signed out.`);
} else {
  await db.insert(staffUsersTable).values({ username, displayName: displayName || rawUsername.trim(), passwordHash });
  console.log(`Staff account "${username}" created. Sign in at /admin.`);
}

await pool.end();
