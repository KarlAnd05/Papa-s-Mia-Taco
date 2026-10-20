import type { ErrorRequestHandler } from "express";
import { z } from "zod/v4";
import type { db } from "@workspace/db";

// An error with an HTTP status that the error handler turns into `{ error, ...extra }`.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

// Parse request input with a zod schema; invalid input becomes a 400 with a readable message.
export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.length ? `${issue.path.join(".")}: ` : "";
    throw new HttpError(400, `${field}${issue.message}`);
  }
  return result.data;
}

export function parseId(raw: unknown): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Invalid id");
  return id;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, ...err.extra });
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }
  req.log.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Something went wrong. Please try again." });
};

// The database or a transaction — lets helpers run inside or outside a transaction.
export type Executor = Pick<typeof db, "select" | "insert" | "update" | "delete" | "execute">;

// Reusable zod field helpers.
// Optional text: "" becomes null (clears the field); a missing key stays undefined so that
// partial updates leave the stored value untouched (drizzle skips undefined columns).
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v === undefined ? undefined : v || null));

export const optionalEmail = optionalText(120).refine(
  (v) => v == null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
  "Please enter a valid email address",
);

export const phoneField = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .max(30)
  .refine((v) => /^[+\d\s().-]+$/.test(v) && v.replace(/\D/g, "").length >= 7, "Please enter a valid phone number");

export const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Invalid date");

export const timeField = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM");

export const phoneDigits = (phone: string) => phone.replace(/\D/g, "");

// Same phone number, ignoring formatting and a country-code prefix ("+961 76 553 475" vs "76553475").
export function samePhone(a: string, b: string): boolean {
  const x = phoneDigits(a);
  const y = phoneDigits(b);
  if (x === y) return x.length > 0;
  const [short, long] = x.length < y.length ? [x, y] : [y, x];
  return short.length >= 8 && long.endsWith(short);
}
