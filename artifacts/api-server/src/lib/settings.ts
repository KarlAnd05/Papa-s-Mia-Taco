import { z } from "zod/v4";
import { db, appSettingsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { isValidTimeZone } from "./time";

// Restaurant settings editable from Admin → Settings. Stored per section in app_settings
// and merged over these defaults, so new fields get sensible values automatically.

const socialUrl = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Social links must start with https://");

export const settingsSchema = z.object({
  restaurant: z.object({
    name: z.string().trim().min(1).max(100),
    location: z.string().trim().max(60), // shown on the home page, e.g. "Lebanon" or "Beirut"
    address: z.string().trim().max(200),
    phone: z.string().trim().max(40),
    hours: z.string().trim().max(400), // one line per row, shown in the footer
    instagram: socialUrl,
    facebook: socialUrl,
    tiktok: socialUrl,
    timezone: z.string().refine(isValidTimeZone, "Unknown timezone"),
  }),
  ordering: z.object({
    enabled: z.boolean(),
    pickupEnabled: z.boolean(),
    deliveryEnabled: z.boolean(),
    deliveryFee: z.number().min(0).max(1000),
    minimumOrder: z.number().min(0).max(10000),
    pickupMinutes: z.number().int().min(0).max(240),
    deliveryMinutes: z.number().int().min(0).max(480),
  }),
  tax: z.object({
    rate: z.number().min(0).max(50),
    label: z.string().trim().min(1).max(30),
  }),
  reservations: z.object({
    enabled: z.boolean(),
    maxPartySize: z.number().int().min(1).max(100),
    bookingWindowDays: z.number().int().min(1).max(365),
    minNoticeMinutes: z.number().int().min(0).max(10080),
    autoApprove: z.boolean(),
  }),
});

export type Settings = z.infer<typeof settingsSchema>;
type Section = keyof Settings;
const SECTIONS = Object.keys(settingsSchema.shape) as Section[];

export const DEFAULT_SETTINGS: Settings = {
  restaurant: {
    name: "Papa's Mia Tacos",
    location: "Lebanon",
    address: "", // not known yet — set in Admin → Settings
    phone: "+961 76 553 475", // from the restaurant's packaging
    // Carried over from the original site — confirm in Admin → Settings
    hours: ["Mon - Thu: 11am - 10pm", "Fri - Sat: 11am - 12am", "Sunday: 12pm - 9pm"].join("\n"),
    instagram: "https://www.instagram.com/papasmiatacos",
    facebook: "https://www.facebook.com/papasmiatacos",
    tiktok: "https://www.tiktok.com/@papasmiatacos",
    timezone: "Asia/Beirut",
  },
  ordering: {
    enabled: true,
    pickupEnabled: true,
    deliveryEnabled: true,
    deliveryFee: 0,
    minimumOrder: 0,
    pickupMinutes: 20,
    deliveryMinutes: 45,
  },
  tax: { rate: 0, label: "Tax" },
  reservations: {
    enabled: true,
    maxPartySize: 12,
    bookingWindowDays: 30,
    minNoticeMinutes: 60,
    autoApprove: false,
  },
};

export async function getSettings(): Promise<Settings> {
  const rows = await db.select().from(appSettingsTable).where(inArray(appSettingsTable.key, SECTIONS));
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const merged = {} as Record<Section, unknown>;
  for (const section of SECTIONS) {
    const value = { ...DEFAULT_SETTINGS[section], ...((stored[section] as object) ?? {}) };
    // Fall back to defaults if a stored section no longer matches the schema
    const parsed = settingsSchema.shape[section].safeParse(value);
    merged[section] = parsed.success ? parsed.data : DEFAULT_SETTINGS[section];
  }
  return merged as Settings;
}

export const settingsUpdateSchema = settingsSchema.partial();

export async function saveSettings(update: Partial<Settings>): Promise<Settings> {
  for (const section of SECTIONS) {
    const value = update[section];
    if (!value) continue;
    await db
      .insert(appSettingsTable)
      .values({ key: section, value })
      .onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: new Date() } });
  }
  return getSettings();
}

// One-off flags used to make startup data migrations run only once.
export async function getFlag(key: string): Promise<boolean> {
  const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key));
  return row?.value === true;
}

export async function setFlag(key: string): Promise<void> {
  await db
    .insert(appSettingsTable)
    .values({ key, value: true })
    .onConflictDoUpdate({ target: appSettingsTable.key, set: { value: true, updatedAt: new Date() } });
}
