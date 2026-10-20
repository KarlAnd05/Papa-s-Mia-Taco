// Integration checks use disposable databases; the configured restaurant data is never changed.
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (!process.env.DATABASE_URL) {
  const envFile = [path.join(root, ".env"), path.join(root, "local-preview/.env"), path.resolve(root, "../../local-preview/.env")].find(fs.existsSync);
  if (envFile) process.loadEnvFile(envFile);
}
if (!process.env.DATABASE_URL) throw new Error("Configure DATABASE_URL before running database verification.");
const { Client } = createRequire(path.join(root, "lib/db/package.json"))("pg");
const maintenanceUrl = new URL(process.env.DATABASE_URL);
maintenanceUrl.pathname = "/postgres";
const maintenance = new Client({ connectionString: maintenanceUrl.href, connectionTimeoutMillis: 5000 });
const database = `pmt_verify_${randomBytes(6).toString("hex")}`;
const sqlDatabase = `${database}_sql`;
const targetUrl = new URL(maintenanceUrl);
targetUrl.pathname = `/${database}`;
const password = randomBytes(18).toString("base64url");
const env = { ...process.env, DATABASE_URL: targetUrl.href, ADMIN_USERNAME: "verify_owner", ADMIN_PASSWORD: password, NODE_ENV: "development" };
let client;
let api;
let apiLog = "";
let maintenanceConnected = false;

function setup() {
  const result = spawnSync(process.execPath, ["./database/setup.mjs"], { cwd: root, env, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stdout + result.stderr);
}

try {
  await maintenance.connect();
  maintenanceConnected = true;
  setup(); // Also checks creation of a missing database.
  client = new Client({ connectionString: targetUrl.href });
  await client.connect();
  const counts = async () => (await client.query(`SELECT
    (SELECT count(*)::int FROM pg_tables WHERE schemaname='public') AS tables,
    (SELECT count(*)::int FROM menu_items) AS menu,
    (SELECT count(*)::int FROM reservation_slots) AS slots,
    (SELECT count(*)::int FROM staff_users) AS staff,
    (SELECT count(*)::int FROM app_settings WHERE key IN ('restaurant','ordering','tax','reservations')) AS settings`)).rows[0];
  assert.deepEqual(await counts(), { tables: 12, menu: 40, slots: 144, staff: 1, settings: 4 });
  await assert.rejects(client.query(`INSERT INTO reservation_slots (day_of_week,time,capacity)
    SELECT day_of_week,time,capacity FROM reservation_slots LIMIT 1`), (err) => err.code === "23505");
  const originalHash = (await client.query("SELECT password_hash FROM staff_users")).rows[0].password_hash;
  assert.ok(originalHash.startsWith("scrypt$"));
  await client.query(`UPDATE app_settings SET value=jsonb_set(value,'{pickupMinutes}','25') WHERE key='ordering'`);
  setup();
  assert.deepEqual(await counts(), { tables: 12, menu: 40, slots: 144, staff: 1, settings: 4 });
  assert.equal((await client.query("SELECT password_hash FROM staff_users")).rows[0].password_hash, originalHash);
  assert.equal((await client.query("SELECT value->>'pickupMinutes' AS minutes FROM app_settings WHERE key='ordering'")).rows[0].minutes, "25");
  console.log("PASS: fresh setup, required seed data, duplicate-slot protection, and repeat setup preserving accounts/settings.");

  await maintenance.query(`CREATE DATABASE "${sqlDatabase}"`);
  const sqlUrl = new URL(maintenanceUrl);
  sqlUrl.pathname = `/${sqlDatabase}`;
  const sqlClient = new Client({ connectionString: sqlUrl.href });
  try {
    await sqlClient.connect();
    await sqlClient.query(fs.readFileSync(path.join(root, "database/schema.sql"), "utf8"));
    assert.equal((await sqlClient.query("SELECT count(*)::int AS tables FROM pg_tables WHERE schemaname='public'")).rows[0].tables, 12);
  } finally { await sqlClient.end(); }
  console.log("PASS: schema.sql imports into an empty database with all 12 tables.");

  const portFinder = net.createServer();
  portFinder.listen(0, "127.0.0.1");
  await once(portFinder, "listening");
  const port = portFinder.address().port;
  await new Promise((resolve) => portFinder.close(resolve));
  api = spawn(process.execPath, ["--enable-source-maps", "./dist/index.mjs"], {
    cwd: path.join(root, "artifacts/api-server"), env: { ...env, PORT: String(port) }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  });
  api.stdout.on("data", (chunk) => { apiLog += chunk; });
  api.stderr.on("data", (chunk) => { apiLog += chunk; });
  const base = `http://127.0.0.1:${port}/api`;
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { ready = (await fetch(`${base}/healthz`, { signal: AbortSignal.timeout(500) })).ok; } catch {}
    if (ready || api.exitCode !== null) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, apiLog);
  let cookie = "";
  async function request(endpoint, { method = "GET", body, staff = false, status = 200 } = {}) {
    const response = await fetch(base + endpoint, {
      method, headers: { "Content-Type": "application/json", ...(staff ? { cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000),
    });
    const payload = await response.json();
    assert.equal(response.status, status, `${method} ${endpoint}: ${JSON.stringify(payload)}`);
    if (endpoint === "/auth/login") cookie = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    return payload;
  }
  await request("/orders", { status: 401 });
  await request("/auth/login", { method: "POST", body: { username: env.ADMIN_USERNAME, password } });
  assert.equal((await request("/auth/me", { staff: true })).user.username, env.ADMIN_USERNAME);
  await request("/stats/overview", { staff: true });
  console.log("PASS: staff authentication, sessions, and protected dashboard queries.");

  const menu = (await request("/menu-items")).items;
  const item = menu.find((entry) => entry.isAvailable);
  assert.ok(item);
  const selections = item.options.filter((group) => group.required).map((group) => ({ groupId: group.id, choiceIds: [group.choices[0].id] }));
  const items = [{ menuItemId: item.id, quantity: 2, selections }];
  const order = await request("/public/orders", { method: "POST", status: 201, body: {
    orderType: "pickup", customer: { name: "Database verification", phone: "+96170000123" }, items,
  } });
  assert.equal((await request(`/public/orders/${order.token}`)).id, order.id);
  for (const status of ["preparing", "ready", "completed"]) {
    await request(`/orders/${order.id}/status`, { method: "PATCH", staff: true, body: { status, paymentMethod: "cash" } });
  }
  const customer = (await client.query("SELECT id,total_orders,total_spent FROM customers")).rows[0];
  assert.equal(customer.total_orders, 1);
  const pos = await request("/orders", { method: "POST", staff: true, status: 201, body: { orderType: "takeaway", customerId: customer.id, items, paymentMethod: "card" } });
  assert.equal(pos.status, "completed");
  assert.equal((await client.query("SELECT total_orders FROM customers WHERE id=$1", [customer.id])).rows[0].total_orders, 2);
  assert.equal((await client.query("SELECT count(*)::int AS lines FROM order_items")).rows[0].lines, 2);
  console.log("PASS: online ordering, tracking, staff fulfilment, POS sales, order lines, and customer totals.");

  const dates = await request("/reservations/dates?partySize=2");
  const date = dates.dates.find((value) => value > dates.today);
  assert.ok(date);
  const availability = await request(`/reservations/availability?date=${date}&partySize=2`);
  const slot = availability.slots.find((entry) => entry.available);
  assert.ok(slot);
  const booking = await request("/reservations", { method: "POST", status: 201, body: {
    date, time: slot.time, partySize: 2, name: "Database verification", phone: "+96170000123",
  } });
  const bookingId = (await client.query("SELECT id FROM reservations WHERE access_token=$1", [booking.token])).rows[0].id;
  await request(`/admin/reservations/${bookingId}`, { method: "PATCH", staff: true, body: { status: "approved" } });
  assert.equal((await request(`/reservations/status/${booking.token}`)).status, "approved");
  await request(`/reservations/status/${booking.token}/cancel`, { method: "POST" });
  assert.equal((await client.query("SELECT status FROM reservations WHERE id=$1", [bookingId])).rows[0].status, "cancelled");
  await request("/feedback", { method: "POST", status: 201, body: {
    name: "Database verification", ratingFood: 5, ratingService: 5, ratingAtmosphere: 5, ratingValue: 5, ratingOverall: 5,
  } });
  assert.equal((await request("/feedback", { staff: true })).total, 1);
  await request("/admin/notifications/counts", { staff: true });
  await request("/auth/logout", { method: "POST", staff: true });
  console.log("PASS: booking availability, reservation approval/cancellation, feedback, and staff notifications.");
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  if (api && api.exitCode === null) {
    const exited = once(api, "exit");
    api.kill();
    await exited;
  }
  await client?.end();
  // Both identifiers are generated above; never drop the configured application database.
  if (maintenanceConnected) {
    for (const temporary of [sqlDatabase, database]) {
      assert.match(temporary, /^pmt_verify_[a-f0-9]{12}(?:_sql)?$/);
      await maintenance.query(`DROP DATABASE IF EXISTS "${temporary}" WITH (FORCE)`);
    }
  }
  await maintenance.end();
}
