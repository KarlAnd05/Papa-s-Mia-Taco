import { count, eq, inArray } from "drizzle-orm";
import { db, appSettingsTable, menuItemsTable, reservationSlotsTable, staffUsersTable } from "@workspace/db";
import { hashPassword, PASSWORD_MIN_LENGTH } from "@workspace/db/password";
import { menuData, REMOVED_MENU_ITEMS } from "../data/menuSeed";
import { normalizeUsername } from "./auth";
import { logger } from "./logger";
import { DEFAULT_SETTINGS, getFlag, setFlag } from "./settings";

// Startup data setup. Each step is safe to run on every boot.

// Bump when menuSeed.ts is updated for a new printed menu, so existing databases pick it up once.
const MENU_SEED_VERSION = "menu_seed_2026_10";
const SLOTS_FLAG = "reservation_slots_seeded_v1";

function seedRows(): (typeof menuItemsTable.$inferInsert)[] {
  return menuData.flatMap((section, sectionIdx) =>
    section.items.map((item, itemIdx) => ({
      category: section.category,
      sortOrder: sectionIdx * 100 + itemIdx,
      name: item.name,
      description: item.desc ?? null,
      price: item.price.toFixed(2),
      note: item.note ?? null,
      callout: section.callout ?? null,
      boost: section.boost ?? null,
      isNew: item.isNew ?? false,
      options: item.options ?? [],
    })),
  );
}

// Keep initial settings in the database without replacing the restaurant's edits.
async function ensureDefaultSettings(): Promise<void> {
  await db
    .insert(appSettingsTable)
    .values(Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value })))
    .onConflictDoNothing({ target: appSettingsTable.key });
}

// Seed the menu from the printed menu if the table is empty
export async function ensureMenuSeeded(): Promise<void> {
  const existing = await db.select({ id: menuItemsTable.id }).from(menuItemsTable).limit(1);
  if (existing.length > 0) return;
  await db.insert(menuItemsTable).values(seedRows());
  await setFlag(MENU_SEED_VERSION);
}

// Apply a new printed menu to an existing database, once: items are matched by name and get the
// printed prices, descriptions, options and order; new items are added; items dropped from the
// printed menu are removed. Availability toggles and items staff added themselves are kept.
async function syncMenuWithSeed(): Promise<void> {
  if (await getFlag(MENU_SEED_VERSION)) return;
  const existing = await db.select().from(menuItemsTable);
  let updated = 0;
  let added = 0;
  await db.transaction(async (tx) => {
    for (const row of seedRows()) {
      const match = existing.find((i) => i.name.toLowerCase() === row.name.toLowerCase());
      if (match) {
        await tx.update(menuItemsTable).set({ ...row, updatedAt: new Date() }).where(eq(menuItemsTable.id, match.id));
        updated++;
      } else {
        await tx.insert(menuItemsTable).values(row);
        added++;
      }
    }
    if (REMOVED_MENU_ITEMS.length) {
      await tx.delete(menuItemsTable).where(inArray(menuItemsTable.name, REMOVED_MENU_ITEMS));
    }
  });
  await setFlag(MENU_SEED_VERSION);
  logger.info({ version: MENU_SEED_VERSION, updated, added, removed: REMOVED_MENU_ITEMS }, "Menu synced with printed menu");
}

// Default weekly reservation times based on the posted opening hours: every 30 minutes,
// last seating 90 minutes before closing, 20 guests per time. Staff adjust these in Admin → Reservations.
async function ensureReservationSlots(): Promise<void> {
  if (await getFlag(SLOTS_FLAG)) return;
  const [{ existing }] = await db.select({ existing: count() }).from(reservationSlotsTable);
  if (existing === 0) {
    const hours: Record<number, [number, number]> = {
      0: [12 * 60, 21 * 60], // Sunday 12pm–9pm
      1: [11 * 60, 22 * 60], // Mon–Thu 11am–10pm
      2: [11 * 60, 22 * 60],
      3: [11 * 60, 22 * 60],
      4: [11 * 60, 22 * 60],
      5: [11 * 60, 24 * 60], // Fri–Sat 11am–12am
      6: [11 * 60, 24 * 60],
    };
    const rows: (typeof reservationSlotsTable.$inferInsert)[] = [];
    for (const [day, [open, close]] of Object.entries(hours)) {
      for (let m = open; m <= close - 90; m += 30) {
        const time = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
        rows.push({ dayOfWeek: Number(day), time, capacity: 20, isActive: true });
      }
    }
    await db.insert(reservationSlotsTable).values(rows);
    logger.info({ slots: rows.length }, "Default reservation time slots created");
  }
  await setFlag(SLOTS_FLAG);
}

// Create the first staff account from ADMIN_USERNAME / ADMIN_PASSWORD when none exist yet.
async function ensureFirstAdmin(): Promise<void> {
  const [{ staff }] = await db.select({ staff: count() }).from(staffUsersTable);
  if (staff > 0) return;

  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    logger.warn(
      "No staff accounts exist yet. Set ADMIN_USERNAME and ADMIN_PASSWORD and restart, or run `pnpm --filter @workspace/scripts run create-admin -- <username> <password>`.",
    );
    return;
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    logger.error(`ADMIN_PASSWORD must be at least ${PASSWORD_MIN_LENGTH} characters; first admin not created.`);
    return;
  }
  await db.insert(staffUsersTable).values({
    username: normalizeUsername(username),
    displayName: username,
    passwordHash: await hashPassword(password),
  });
  logger.info({ username: normalizeUsername(username) }, "First admin account created");
}

export async function bootstrap({ strict = false }: { strict?: boolean } = {}): Promise<void> {
  const steps: [string, () => Promise<void>][] = [
    ["default settings", ensureDefaultSettings],
    ["menu seed", ensureMenuSeeded],
    ["menu sync", syncMenuWithSeed],
    ["reservation slots", ensureReservationSlots],
    ["first admin", ensureFirstAdmin],
  ];
  for (const [name, step] of steps) {
    try {
      await step();
    } catch (err) {
      logger.error({ err }, `Startup step failed: ${name}`);
      if (strict) throw err;
    }
  }
}
