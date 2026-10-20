# PMT Mexican Restaurant

Website for PMT (Papa Mia Tacos): public menu, online ordering (pickup/delivery, pay in person), table reservations, and a hidden staff area with a cashier POS, order and reservation management, menu/price editing, customers and settings.

## Run & Operate

- `pnpm db:setup` — create the configured database if needed, apply the schema, and seed the menu, settings, reservation slots and first staff account. Reads root `.env` or the Windows preview settings when `DATABASE_URL` is not already set. See `database/README.txt` for local startup and the schema-only SQL export.
- `pnpm --filter @workspace/api-server run dev` — run the API server (port from `PORT`)
- `pnpm --filter @workspace/pmt-restaurant run dev` — run the website (Vite; proxies `/api` to `localhost:8080` or `API_PORT` when run outside Replit)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes. **Run it against both the development and the production database after pulling schema changes** (new columns are nullable/defaulted so it never prompts)
- `pnpm --filter @workspace/scripts run create-admin -- <username> <password> ["Display Name"]` — create a staff account, or reset its password (also re-activates it)

Environment:
- `DATABASE_URL` — Postgres connection string (required)
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — on startup, if no staff account exists yet, the first one is created from these (password ≥ 8 characters). Not needed afterwards.

## Staff access (hidden)

- There are no staff links on the public site. Go to `/admin` (redirects to `/admin/login`), or tap the "PMT" logo in the footer 5 times.
- Username + password login. Passwords are hashed with scrypt; sessions are random tokens in an HttpOnly, SameSite=Lax cookie (`pmt_session`, 7 days) and only their SHA-256 hash is stored.
- Every staff account is a full admin (no roles). Accounts are managed in Admin → Settings.
- 5 wrong passwords for a username (or 20 from one IP) lock login for 15 minutes.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, validation with Zod (`zod/v4`)
- DB: PostgreSQL + Drizzle ORM
- Web: React 19, Vite, Tailwind 4, wouter, TanStack Query, shadcn/ui
- API codegen: Orval (from OpenAPI spec) — only the customers/stats endpoints; newer endpoints use `src/lib/api.ts` with types in `src/lib/types.ts`

## Where things live

- DB schema: `lib/db/src/schema/` (`menuItems` incl. item options, `orders`, `reservations`, `staff`, `settings`, `customers`, `feedback`; `admins` is legacy)
- Password hashing: `lib/db/src/password.ts`
- API routes: `artifacts/api-server/src/routes/` — `auth`, `staff`, `settings`, `menuItems`, `orders` (POS + management), `publicOrders` (customer checkout/status), `reservations` (public), `adminReservations`, `admin` (stats + notification counts)
- Pricing (single source of truth for every order): `artifacts/api-server/src/lib/pricing.ts`
- Reservation capacity logic: `artifacts/api-server/src/lib/availability.ts`
- Startup seeding/migrations (menu seed, option backfill, default time slots, first admin): `artifacts/api-server/src/lib/bootstrap.ts`
- Printed menu as data (from `attached_assets/PMT_Menu_2026-10.pdf`): `artifacts/api-server/src/data/menuSeed.ts`; menu photos in `artifacts/pmt-restaurant/public/images/` (cut from the same PDF)
- Customer pages: `artifacts/pmt-restaurant/src/pages/` — `Home`, `OrderOnline`, `Checkout`, `OrderStatus`, `Reservations`, `ReservationStatus`, `Feedback`
- Staff pages: `Admin.tsx` (layout, guard, dashboard, live alerts), `AdminPOS`, `AdminOrders`, `AdminReservations`, `AdminMenu`, `AdminCustomers`, `AdminSettings`, `AdminLogin`
- Shared site look (papel picado, navbar, footer): `artifacts/pmt-restaurant/src/components/site/`
- Receipt/invoice + print styles: `src/components/Receipt.tsx`, `src/index.css` (`.print-root`)
- Logo: source `attached_assets/Papas_Mia_Tacos_Logo.pdf` (vector); web files in `artifacts/pmt-restaurant/public/` (`logo.webp`, `favicon.png`, `apple-touch-icon.png`, `icon-512.png`, `og-image.jpg` for link previews)

## Architecture decisions

- One menu table feeds the website, online ordering and the POS. Items carry option groups (`menu_items.options` jsonb: sizes, add-ons, sauces); order lines snapshot the chosen options and prices.
- The server re-prices every order from the database (integer cents); prices sent by the browser are ignored.
- Reservations: weekly time-slot template with a guest capacity per slot, plus blocked dates/times. Pending + approved bookings hold seats. Bookings take a Postgres advisory lock per date+time so the last seats can't be double-booked.
- Customers don't need accounts: orders and reservations get an unguessable status link (token), and reservations a short reference code (+ phone) for lookup.
- Admin alerts poll `/api/admin/notifications/counts` every 15 s (toast + chime + badges) rather than websockets, which keeps it simple behind Replit's proxy.
- "Today", reservation availability and dashboard stats use the restaurant timezone from Settings (default `Asia/Beirut` — the restaurant is in Lebanon).
- Public contact details (location, address, phone, opening hours, Instagram/Facebook/TikTok links) live in Admin → Settings and feed the footer, home page and receipts; empty fields are hidden.

## Product

- Public: menu (from the DB), online ordering with item options, pickup or delivery, pay in person, order status page with printable invoice; table reservations with live availability and a status page (pending/confirmed/declined, cancel online); feedback form.
- Staff: dashboard (today's sales/orders/bookings), POS (big buttons, options, discounts, cash/card with change, printable 80 mm receipts), order management (accept → ready → complete/cancel, history, search), reservations (approve/decline/edit, day view by time slot, weekly slots & capacity, blocked dates, booking rules), menu & prices (incl. options editor), customers, settings (restaurant info, ordering, tax, staff accounts).

## Gotchas

- `pnpm --filter @workspace/db run push` must be run for each database (dev and production) after schema changes.
- Login lockouts and form rate limits are in-memory per server instance (they reset on restart).
- Startup data steps are guarded by flags in `app_settings` (`menu_seed_2026_10`, `reservation_slots_seeded_v1`); deleting all time slots will not re-seed them.
- New printed menu? Update `menuSeed.ts` (and `REMOVED_MENU_ITEMS`) and bump `MENU_SEED_VERSION` in `lib/bootstrap.ts`. On the next start each database is synced once: items matched by name get the printed price/description/options/order, new items are added, removed ones deleted. Availability toggles and staff-added items are kept; staff price edits on printed items are overwritten.
- Tax defaults to 0 (menu prices used as-is). Set it in Settings if prices exclude tax.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
