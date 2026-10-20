// Local Postgres database for previewing the website on this computer.
// Started by start.ps1 — data is kept in the "data" folder next to this file.
import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, "data");
const port = Number(process.env.DB_PORT ?? 54330);
const fresh = !fs.existsSync(dir);

const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: "postgres",
  password: "postgres",
  port,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

if (fresh) await pg.initialise();
// Remove a stale lock only after confirming its server process is gone.
// Never remove the lock of a running server: that could start two writers on the same data.
const pidFile = path.join(dir, "postmaster.pid");
if (fs.existsSync(pidFile)) {
  const pid = Number(fs.readFileSync(pidFile, "utf8").split(/\r?\n/)[0]);
  if (!Number.isInteger(pid) || pid <= 0) throw new Error("The database PID file is invalid; inspect it before restarting.");
  let alive = true;
  try { process.kill(pid, 0); } catch (err) {
    if (err.code === "ESRCH") alive = false;
    else throw err;
  }
  if (alive) throw new Error(`The database process ${pid} is already running. Stop the preview before starting another database.`);
  fs.unlinkSync(pidFile);
}
await pg.start();
if (fresh) await pg.createDatabase("pmt");
console.log(`READY postgres on port ${port}`);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
