LOCAL PREVIEW OF THE PAPA'S MIA TACOS WEBSITE
==============================================

This folder runs the website on this computer so you can try it before it goes live.
The launcher is included in Git; local credentials, data, logs and backups are ignored.

FIRST SETUP (Node.js 24 and pnpm required):
  From the repository root, run:
    pnpm.cmd install --frozen-lockfile
    npm.cmd --prefix local-preview ci

START:  double-click "Start Preview.cmd"
        -> opens http://localhost:5173 in your browser when everything is ready.

STOP:   double-click "Stop Preview.cmd"

STAFF AREA:  http://localhost:5173/admin
             The username and password are in the ".env" file in this folder.

The website needs three things running together: the database, the API server and the
website itself. Starting only the website (for example with "pnpm ... vite") gives
"http proxy error ... ECONNREFUSED" messages - use "Start Preview.cmd" instead.

Files:
  data\   the local database (test orders, reservations, menu edits)
  logs\   messages from each part, useful if something does not start
  .env    local settings and the staff login (created on first start)

Local data is kept between starts. Back it up before making database changes.
