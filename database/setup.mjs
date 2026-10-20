import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbDir = path.join(root, "lib/db");
const apiDir = path.join(root, "artifacts/api-server");
const require = createRequire(path.join(dbDir, "package.json"));
const { Client } = require("pg");

// Explicit environment variables take priority; otherwise use this project's settings.
if (!process.env.DATABASE_URL) {
  const envFile = [path.join(root, ".env"), path.join(root, "local-preview/.env"), path.resolve(root, "../../local-preview/.env")].find(fs.existsSync);
  if (envFile) process.loadEnvFile(envFile);
}
if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL, or copy .env.example to .env and fill in your PostgreSQL credentials.");
  process.exit(1);
}

const url = new URL(process.env.DATABASE_URL);
const database = decodeURIComponent(url.pathname.slice(1));
if (!database) throw new Error("DATABASE_URL must include a database name.");
const quote = (name) => '"' + name.replaceAll('"', '""') + '"';

async function connect(connectionString) {
  // PostgreSQL opens its TCP port before crash recovery / initial startup finishes.
  for (let attempt = 0; ; attempt++) {
    const connection = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    try {
      await connection.connect();
      return connection;
    } catch (err) {
      await connection.end();
      if (attempt >= 49 || !["57P03", "ECONNREFUSED", "ECONNRESET"].includes(err.code)) throw err;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

function runNode(args, cwd) {
  const result = spawnSync(process.execPath, args, { cwd, env: process.env, encoding: "utf8", windowsHide: true });
  const output = (result.stdout ?? "") + (result.stderr ?? "");
  process.stdout.write(output);
  // Drizzle can print a non-interactive prompt error and still exit with status 0.
  if (result.error || result.status !== 0 || /(?:^|\n)(?:Error:|error:)|Interactive prompts require a TTY/.test(output)) {
    throw new Error("Database setup stopped. Resolve the error above and run it again; no tables are truncated automatically.");
  }
}

let client;
try {
  try {
    client = await connect(url.href);
  } catch (err) {
    if (err.code !== "3D000") throw err;
    const maintenanceUrl = new URL(url);
    maintenanceUrl.pathname = "/postgres";
    const maintenance = await connect(maintenanceUrl.href);
    try {
      await maintenance.query(`CREATE DATABASE ${quote(database)} ENCODING 'UTF8' TEMPLATE template0`);
      console.log(`Created database ${database}.`);
    } finally {
      await maintenance.end();
    }
    client = await connect(url.href);
  }

  await client.query("SELECT pg_advisory_lock(hashtext('pmt_database_setup'))");
  // Migrate the old composite UNIQUE constraint to an equivalent unique index.
  // Drizzle 0.31 reads the old columns in reverse order, causing a false change on every boot.
  const legacy = await client.query(`
    SELECT c.conname, ARRAY(
      SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, position)
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum ORDER BY k.position
    ) AS columns
    FROM pg_constraint c WHERE c.conrelid = to_regclass('public.reservation_slots')
      AND c.conname = 'reservation_slots_day_time_uq' AND c.contype = 'u'
  `);
  if (legacy.rowCount) {
    if (legacy.rows[0].columns.join(",") !== "day_of_week,time") {
      throw new Error("The existing reservation slot constraint has unexpected columns; it was left unchanged.");
    }
    await client.query("BEGIN");
    try {
      await client.query("LOCK TABLE public.reservation_slots IN ACCESS EXCLUSIVE MODE");
      await client.query("ALTER TABLE public.reservation_slots DROP CONSTRAINT reservation_slots_day_time_uq");
      await client.query('CREATE UNIQUE INDEX reservation_slots_day_time_uq ON public.reservation_slots (day_of_week, "time")');
      await client.query("COMMIT");
      console.log("Updated reservation slot uniqueness without removing rows.");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }

  console.log(`Updating ${url.hostname}:${url.port || "5432"}/${database}...`);
  const cli = path.join(path.dirname(require.resolve("drizzle-kit")), "bin.cjs");
  runNode([cli, "push", "--config", "./drizzle.config.ts"], dbDir);
  runNode(["./build.mjs"], apiDir);
  runNode(["--enable-source-maps", "./dist/seed.mjs"], apiDir);
  console.log("Database setup complete. Existing accounts and restaurant data were preserved.");
} catch (err) {
  console.error(err instanceof Error ? err.message : "Database setup failed.");
  process.exitCode = 1;
} finally {
  await client?.end(); // Also releases the session-level setup lock.
}
