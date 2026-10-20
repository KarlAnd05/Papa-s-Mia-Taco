import { Router } from "express";
import { z } from "zod/v4";
import { and, asc, count, eq, ne } from "drizzle-orm";
import { db, staffUsersTable } from "@workspace/db";
import { hashPassword, PASSWORD_MIN_LENGTH } from "@workspace/db/password";
import { normalizeUsername, requireStaff, revokeSessions } from "../lib/auth";
import { HttpError, parse, parseId } from "../lib/http";

// Staff account management. Every staff account is a full admin.
const router = Router();
router.use("/staff", requireStaff);

const publicFields = {
  id: staffUsersTable.id,
  username: staffUsersTable.username,
  displayName: staffUsersTable.displayName,
  isActive: staffUsersTable.isActive,
  lastLoginAt: staffUsersTable.lastLoginAt,
  createdAt: staffUsersTable.createdAt,
};

const passwordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(200);

router.get("/staff", async (_req, res) => {
  const staff = await db.select(publicFields).from(staffUsersTable).orderBy(asc(staffUsersTable.createdAt));
  res.json({ staff });
});

const createBody = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, "Username can only contain letters, numbers, dots, dashes and underscores"),
  displayName: z.string().trim().min(1, "Name is required").max(80),
  password: passwordField,
});

router.post("/staff", async (req, res) => {
  const body = parse(createBody, req.body);
  const username = normalizeUsername(body.username);
  const [existing] = await db.select({ id: staffUsersTable.id }).from(staffUsersTable).where(eq(staffUsersTable.username, username));
  if (existing) throw new HttpError(409, "That username is already taken");
  const [user] = await db
    .insert(staffUsersTable)
    .values({ username, displayName: body.displayName, passwordHash: await hashPassword(body.password) })
    .returning(publicFields);
  res.status(201).json(user);
});

const updateBody = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  isActive: z.boolean().optional(),
  password: passwordField.optional(),
});

router.patch("/staff/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const body = parse(updateBody, req.body);

  if (body.isActive === false) {
    if (id === req.staff!.id) throw new HttpError(400, "You can't deactivate your own account");
    const [{ active }] = await db
      .select({ active: count() })
      .from(staffUsersTable)
      .where(and(eq(staffUsersTable.isActive, true), ne(staffUsersTable.id, id)));
    if (active === 0) throw new HttpError(400, "At least one active staff account is required");
  }

  const updates: Partial<typeof staffUsersTable.$inferInsert> = { updatedAt: new Date() };
  if (body.displayName !== undefined) updates.displayName = body.displayName;
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.password !== undefined) updates.passwordHash = await hashPassword(body.password);

  const [user] = await db.update(staffUsersTable).set(updates).where(eq(staffUsersTable.id, id)).returning(publicFields);
  if (!user) throw new HttpError(404, "Staff account not found");

  // Deactivation or a password reset signs that account out everywhere (except this browser if it's you)
  if (body.isActive === false || body.password !== undefined) {
    await revokeSessions(id, id === req.staff!.id ? req.staff!.tokenHash : undefined);
  }
  res.json(user);
});

export default router;
