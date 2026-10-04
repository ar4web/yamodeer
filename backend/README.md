# Local PostgreSQL Work Hub slice (fake data only)

This is a local development integration spike for the Work Hub. It persists tasks, reminders, notebooks and entries in PostgreSQL. The API deliberately uses the current HRMS role selector as a **demo-only workspace partition**; it does not authenticate users and is not production-ready.

**Do not use real employee, payroll, identity, mail or other personal data with this setup. Do not expose the API or its demo-role header to the public internet.** Production requires real identity, tenant/user ownership, server-side authorization, audit policy, backups, managed secrets, TLS and a reviewed deployment configuration.

## Requirements

- Node.js 20+
- Docker with Docker Compose

## Start locally

From the repository root, use three terminals:

1. Start the local PostgreSQL container:

   ```bash
   npm run db:up
   ```

   PostgreSQL is published on `127.0.0.1:5433` only. The Compose password and database name are local demo credentials, not production secrets.

2. Start the local-only API (it applies the SQL migration on startup):

   ```bash
   npm run dev:api
   ```

   The API is restricted to `127.0.0.1` and listens on port `8787` by default. `API_HOST` overrides are ignored to keep the demo API loopback-only; if set, `API_PORT` must be an integer from 1 through 65535. Check `http://127.0.0.1:8787/api/health` for a local health response. The health endpoint returns `503` if PostgreSQL becomes unavailable.

3. Enable the frontend adapter and start Vite:

   Copy `.env.local.example` to `.env.local` (for example, `cp .env.local.example .env.local` on macOS/Linux or `Copy-Item .env.local.example .env.local` in PowerShell), then run:

   ```bash
   npm run dev
   ```

   Restart Vite after changing `.env.local`. The browser calls relative `/api/...` paths; Vite proxies those paths to the local API. The client sends the selected prototype role as `X-Demo-Role` only while this explicit local adapter is enabled.

If the local API is disabled or unavailable, Work Hub continues with the existing browser-local demo behavior. If you start the API after opening the app, reload the page to retry the connection. The Mail module remains a local demo; this API does not connect mail providers.

## What is persisted

- The SQL migration is `backend/migrations/001_workhub.sql`.
- Each selected demo role has separate normalized task, reminder, notebook and notebook-entry rows.
- Work Hub writes a complete role snapshot transactionally after a local change. This is suitable only for one local demo workspace per role; it is not a multi-user collaboration or concurrency model.
- The Postgres data survives API/container restarts in the named Docker volume `nour_hrms_postgres_data`.

To stop the database without deleting demo records:

```bash
npm run db:down
```

To remove the local demo database volume and its data, run `docker compose down -v` from the repository root. This is destructive.
