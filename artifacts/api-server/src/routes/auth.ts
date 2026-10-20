import { Router } from "express";
import { z } from "zod/v4";
import { eq } from "drizzle-orm";
import { db, staffUsersTable } from "@workspace/db";
import { hashPassword, verifyPassword, PASSWORD_MIN_LENGTH } from "@workspace/db/password";
import { createSession, destroySession, loadStaff, normalizeUsername, requireStaff, revokeSessions } from "../lib/auth";
import { clientIp, RateLimiter } from "../lib/rateLimit";
import { HttpError, parse } from "../lib/http";

const router = Router();

// Lock out after repeated failures: 5 per username, 20 per IP (staff may share one network), for 15 minutes.
const failuresByUser = new RateLimiter(5, 15 * 60 * 1000);
const failuresByIp = new RateLimiter(20, 15 * 60 * 1000);

// Compared against when the username doesn't exist, so response time doesn't reveal valid usernames.
const dummyHash = hashPassword("not-a-real-password");

const loginBody = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
});

router.post("/auth/login", async (req, res) => {
  const { username, password } = parse(loginBody, req.body);
  const userKey = normalizeUsername(username);
  const ipKey = clientIp(req);

  if (failuresByUser.isLimited(userKey) || failuresByIp.isLimited(ipKey)) {
    const wait = Math.max(failuresByUser.retryAfterSeconds(userKey), failuresByIp.retryAfterSeconds(ipKey));
    throw new HttpError(429, `Too many failed attempts. Try again in ${Math.ceil(wait / 60)} minute(s).`);
  }

  const [user] = await db.select().from(staffUsersTable).where(eq(staffUsersTable.username, userKey));
  const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyHash));

  if (!user || !valid || !user.isActive) {
    failuresByUser.hit(userKey);
    failuresByIp.hit(ipKey);
    throw new HttpError(401, "Invalid username or password");
  }

  failuresByUser.reset(userKey);
  await db.update(staffUsersTable).set({ lastLoginAt: new Date() }).where(eq(staffUsersTable.id, user.id));
  await createSession(res, user.id);
  res.json({ user: { id: user.id, username: user.username, displayName: user.displayName } });
});

router.post("/auth/logout", async (req, res) => {
  await destroySession(req, res);
  res.json({ success: true });
});

router.get("/auth/me", async (req, res) => {
  const staff = await loadStaff(req);
  if (!staff) throw new HttpError(401, "Not signed in");
  res.json({ user: { id: staff.id, username: staff.username, displayName: staff.displayName } });
});

const changePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH, `New password must be at least ${PASSWORD_MIN_LENGTH} characters`).max(200),
});

router.post("/auth/change-password", requireStaff, async (req, res) => {
  const { currentPassword, newPassword } = parse(changePasswordBody, req.body);
  const staff = req.staff!;
  const [user] = await db.select().from(staffUsersTable).where(eq(staffUsersTable.id, staff.id));
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new HttpError(400, "Current password is incorrect");
  }
  await db
    .update(staffUsersTable)
    .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(staffUsersTable.id, staff.id));
  // Sign out other devices, keep this one
  await revokeSessions(staff.id, staff.tokenHash);
  res.json({ success: true });
});

export default router;
