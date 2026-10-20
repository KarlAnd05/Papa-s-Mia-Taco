import { createHash, randomBytes } from "node:crypto";
import type { Request, Response, RequestHandler, CookieOptions } from "express";
import { and, eq, lt, ne } from "drizzle-orm";
import { db, staffSessionsTable, staffUsersTable } from "@workspace/db";

// Staff sessions: a random token in an HttpOnly cookie; only its SHA-256 hash is stored.

export const SESSION_COOKIE = "pmt_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type StaffContext = { id: number; username: string; displayName: string; tokenHash: string };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      staff?: StaffContext;
    }
  }
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS,
  };
}

export async function createSession(res: Response, staffUserId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await db.delete(staffSessionsTable).where(lt(staffSessionsTable.expiresAt, new Date()));
  await db.insert(staffSessionsTable).values({
    tokenHash: hashToken(token),
    staffUserId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token === "string" && token) {
    await db.delete(staffSessionsTable).where(eq(staffSessionsTable.tokenHash, hashToken(token)));
  }
  const { maxAge: _maxAge, ...opts } = cookieOptions();
  res.clearCookie(SESSION_COOKIE, opts);
}

export async function loadStaff(req: Request): Promise<StaffContext | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || !token) return null;
  const tokenHash = hashToken(token);
  const [row] = await db
    .select({
      id: staffUsersTable.id,
      username: staffUsersTable.username,
      displayName: staffUsersTable.displayName,
      isActive: staffUsersTable.isActive,
      expiresAt: staffSessionsTable.expiresAt,
    })
    .from(staffSessionsTable)
    .innerJoin(staffUsersTable, eq(staffSessionsTable.staffUserId, staffUsersTable.id))
    .where(eq(staffSessionsTable.tokenHash, tokenHash));
  if (!row || !row.isActive || row.expiresAt <= new Date()) return null;
  return { id: row.id, username: row.username, displayName: row.displayName, tokenHash };
}

// Guards every admin/staff endpoint.
export const requireStaff: RequestHandler = async (req, res, next) => {
  const staff = await loadStaff(req);
  if (!staff) {
    res.status(401).json({ error: "Please sign in to continue" });
    return;
  }
  req.staff = staff;
  next();
};

// Sign a user out everywhere (optionally keeping the current session).
export async function revokeSessions(staffUserId: number, keepTokenHash?: string): Promise<void> {
  await db
    .delete(staffSessionsTable)
    .where(
      keepTokenHash
        ? and(eq(staffSessionsTable.staffUserId, staffUserId), ne(staffSessionsTable.tokenHash, keepTokenHash))
        : eq(staffSessionsTable.staffUserId, staffUserId),
    );
}

export const normalizeUsername = (username: string) => username.trim().toLowerCase();
