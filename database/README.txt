Papa Mia Tacos database
======================

Windows local preview
---------------------
Double-click local-preview\Start Preview.cmd inside the repository after
installing dependencies (see the root README.md).
It starts PostgreSQL on port 54330, applies the current schema, loads the
restaurant's menu and settings, creates the first staff account if necessary,
and starts the API and website. Open http://localhost:5173/admin/login.
The username and password are in local-preview\.env (ADMIN_USERNAME / ADMIN_PASSWORD).
Stop Preview.cmd shuts down only this project's services. Local data persists
in local-preview\data. Never delete that folder to fix a startup error.

Another PostgreSQL server
-------------------------
1. Install workspace dependencies with pnpm.
2. Copy .env.example to .env in the repository root. Set DATABASE_URL to your
   PostgreSQL server, and choose ADMIN_USERNAME and ADMIN_PASSWORD (8+ characters).
3. Run: pnpm db:setup

The setup command creates the database if it does not exist (the PostgreSQL
login needs CREATEDB permission for this), applies the schema using Drizzle,
builds the API and seeds the data. Repeating it preserves existing staff
passwords and restaurant settings. Explicit environment variables take priority.
The PostgreSQL server must already be running.

Verification
------------
Run pnpm db:verify to check fresh database creation, repeated setup, SQL import,
staff login, online ordering, POS, reservations and feedback. The check creates
two disposable pmt_verify_* databases and removes them afterwards. It needs a
PostgreSQL login with CREATEDB permission and does not change restaurant data.

Tables
------
customers          Customer details, visit history and loyalty totals.
menu_items         Menu, prices, availability and option groups.
orders             POS sales and online orders, payment and tracking details.
order_items        Order lines with the original item prices and options.
reservations       Guest bookings and private tracking links.
reservation_slots  Weekly booking times and guest capacity.
reservation_blocks Closed dates and blocked times.
feedback           Customer ratings and comments.
staff_users        Staff accounts with scrypt password hashes.
staff_sessions     Hashed login session tokens.
app_settings       Restaurant, ordering, tax, reservations and seed flags.
admins             Legacy Clerk records, retained to preserve existing data.

Starter data comes from the application's own menuSeed.ts and DEFAULT_SETTINGS:
40 menu items, 144 weekly reservation slots, the four settings sections, and
the first staff account. Orders, customers, bookings and feedback start empty.

SQL and backups
---------------
schema.sql is a schema-only export for an empty PostgreSQL database. It does
not include passwords or customer data. After importing it, run pnpm db:setup
to populate the starter data and verify that an active staff account exists.
lib/db/src/schema/ is the source of truth for future schema changes.

Local database backups belong in local-preview\backups\ and are excluded from
Git. This computer's existing backups (including pmt-ready.dump) are kept in
the original outer local-preview folder; a fresh clone does not include them.
Restore a backup with PostgreSQL's pg_restore into a separate empty database
before switching the app.
