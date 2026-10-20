# Papa's Mia Tacos

Restaurant website and staff dashboard with a shared menu, online pickup and delivery orders, cashier POS, table reservations, customer records, feedback, and restaurant settings.

Built with React, Vite, TypeScript, Express, PostgreSQL, and Drizzle ORM. Staff sign in with a username and password.

## Run on Windows

Install Node.js 24 and pnpm, then run these commands from the repository root in PowerShell:

```powershell
pnpm.cmd install --frozen-lockfile
npm.cmd --prefix local-preview ci
```

Double-click `local-preview/Start Preview.cmd`. It starts the local PostgreSQL database, applies the schema, loads the menu and booking slots, creates the first staff account, and starts the API and website.

- Website: http://localhost:5173
- Staff login: http://localhost:5173/admin/login
- Local username and generated password: `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `local-preview/.env`.

Use `local-preview/Stop Preview.cmd` to stop the services. Your database stays in `local-preview/data`. Credentials, database files, logs, and backups are excluded from Git.

## Use an existing PostgreSQL server

Copy `.env.example` to `.env`, fill in `DATABASE_URL`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD`, then run:

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd db:setup
node --env-file=.env --enable-source-maps ./artifacts/api-server/dist/index.mjs
```

In a second terminal, start the website:

```powershell
pnpm.cmd --filter @workspace/pmt-restaurant exec vite --host 127.0.0.1 --port 5173 --strictPort
```

The API uses port 8080 in `.env.example`; the website forwards `/api` requests to it. On other operating systems, use `pnpm` in place of `pnpm.cmd`. The PostgreSQL login needs permission to create the configured database if it does not already exist.

## Database and checks

The setup includes 12 tables, 40 menu items, 144 weekly reservation slots, restaurant settings, and the initial staff account. Existing staff passwords and settings are preserved when setup is repeated. See [database/README.txt](database/README.txt) and [database/schema.sql](database/schema.sql).

```powershell
pnpm.cmd run typecheck
pnpm.cmd run build
pnpm.cmd db:verify
```

Database verification uses disposable databases and checks SQL import, repeated setup, staff login, online orders, POS sales, reservations, and feedback. It needs a running PostgreSQL server and a login with permission to create databases.

The workspace is organized into `artifacts/api-server`, `artifacts/pmt-restaurant`, shared packages in `lib`, and administrative commands in `scripts`. See [replit.md](replit.md) for application details.
