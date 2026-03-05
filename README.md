# LeadBot

Production-ready SaaS: embeddable website chat widget that captures and qualifies leads with AI and pushes qualified leads to your CRM (webhook + HubSpot).

## Features

- **Embeddable widget**: Single `<script>` snippet on any website
- **Chat UI**: Bot avatar, messages, typing indicator, offline mode + lead capture form
- **AI**: Lightweight guidance, qualification data collection, lead scoring (0–100)
- **CRM**: Qualified leads pushed via **webhook** (POST JSON) or **HubSpot** (OAuth, contact creation)
- **Dashboard**: Sites, widget config, leads table, session transcripts, integrations, analytics
- **Multi-tenant**: Tenant-scoped data, GDPR basics (hashed IP, minimal PII)

## Tech stack

- **Monorepo**: pnpm workspaces
- **Web + API**: Next.js 14 (App Router), TypeScript
- **DB**: Postgres + Prisma
- **Auth**: NextAuth (credentials)
- **Jobs**: BullMQ + Redis (CRM push, retries)
- **AI**: OpenAI-compatible API (server-side)
- **Widget**: Vite + TypeScript → single `leadbot.js` bundle
- **Styling**: TailwindCSS

## Prerequisites

- Node.js >= 18
- pnpm 9
- Docker & Docker Compose (for Postgres + Redis locally)

## Environment variables

Copy `.env.example` to `.env.local` in the repo root (or into `apps/web/.env.local` for the Next app). Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string |
| `NEXTAUTH_URL` | App URL (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Secret for JWT (e.g. `openssl rand -base64 32`) |
| `OPENAI_API_KEY` | OpenAI API key (required for AI) |
| `OPENAI_MODEL` | Model (default: `gpt-4o-mini`) |
| `NEXT_PUBLIC_APP_URL` | Public base URL (widget script + transcript links) |
| `HUBSPOT_CLIENT_ID` / `HUBSPOT_CLIENT_SECRET` | Optional, for HubSpot OAuth |

## Run locally with Docker

1. **Start Postgres and Redis**

   ```bash
   docker-compose up -d
   ```

2. **Install dependencies and generate Prisma client**

   ```bash
   pnpm install
   ```

3. **Create `.env.local`** (see `.env.example`) with at least:

   ```env
   DATABASE_URL="postgresql://leadbot:leadbot@localhost:5432/leadbot"
   REDIS_URL="redis://localhost:6379"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret"
   OPENAI_API_KEY="sk-..."
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Run migrations and seed**

   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

   Or, to sync schema without migration history: `pnpm db:push` then `pnpm db:seed`.

5. **Build the widget and copy into the web app**

   ```bash
   pnpm build:widget
   cp apps/widget/dist/leadbot.js apps/web/public/widget/
   ```

6. **Start the web app**

   ```bash
   pnpm dev:web
   ```

   Optional: run the CRM worker in another terminal (for webhook/HubSpot pushes):

   ```bash
   cd apps/web && pnpm worker
   ```

7. **Open**

   - Dashboard: http://localhost:3000  
   - Login: `admin@democompany.com` / `demo1234`

## One-command dev

From repo root:

```bash
pnpm dev
```

This builds the widget (if needed), copies it to `apps/web/public/widget/`, and starts the Next.js app. Start Postgres and Redis first (`docker-compose up -d`) and run migrations/seed once.

## Get a site ID and embed snippet

1. Log in to the dashboard.
2. Go to **Sites** → add or select a site (e.g. `demo.example.com`).
3. Open **Configure** for that site.
4. In **Install snippet**, copy the script block. It looks like:

   ```html
   <script>
     window.LEADBOT_SITE_ID = "<site-id>";
   </script>
   <script src="http://localhost:3000/widget/leadbot.js" async></script>
   ```

5. For local demo: put that in a static HTML file and open it (or use `NEXT_PUBLIC_APP_URL` and the same origin as the dashboard).  
   For production: set `NEXT_PUBLIC_APP_URL` to your app URL and use that URL in the script `src`.

Optional: set `window.LEADBOT_BASE_URL = "https://your-leadbot-domain.com"` if the script is loaded from a different origin than your API.

## Giving a customer a demo

To let a **customer** try LeadBot (not just you in Cursor), the app must be reachable on the internet so they can open the dashboard and the widget.

### 1. Deploy the app

Deploy the Next.js app (e.g. Vercel, Railway, Fly.io, or your own server) with:

- **Postgres** and **Redis** (hosted or same provider)
- **Env vars** from the table above; set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to your production URL (e.g. `https://leadbot.yourdomain.com`)
- **Migrations** run on the deployed DB
- **Worker** running somewhere (same host or separate) so CRM/webhook jobs are processed: `pnpm --filter web worker`
- **Widget**: build and copy `leadbot.js` as part of your deploy (or serve from `apps/web/public/widget/`)

### 2. Give them access

**Option A – Shared demo account**  
Use the seeded user (e.g. `admin@democompany.com` / `demo1234`) or create one demo user. Send the customer:

- **Dashboard URL**: `https://your-app.com`
- **Login**: email + password

They can then open **Sider → Konfigurer** and use **“Se demo”** to open the widget try-out page.

**Option B – Dedicated user per customer**  
Create a new tenant and user (e.g. via seed script or a simple admin flow), then send that customer their own dashboard URL and login. They only see their own sites and leads.

### 3. Let them try the widget

- In the dashboard, **Sider → Konfigurer** for a site shows a **“Se demo”** link. It opens:  
  `https://your-app.com/demo?siteId=<that-site-id>`  
  Send that link to the customer so they can try the chat without embedding anything on their site.
- For a **custom demo page** (e.g. on their domain), they add the install snippet with their `siteId` and your `NEXT_PUBLIC_APP_URL` as the script host.

**Summary:** Deploy once → create/login user for the customer → send dashboard URL + login and, if you like, the **“Se demo”** link for that site.

## Deploy to Railway

For a step-by-step guide to deploy LeadBot on [Railway](https://railway.app) (Postgres, Redis, web app + worker), see **[docs/DEPLOY-RAILWAY.md](docs/DEPLOY-RAILWAY.md)**.

## Test webhook integration locally

1. In the dashboard go to **Integrations** and set **Webhook** URL to a receiver, e.g.:
   - **RequestBin**: Create a bin at https://requestbin.com and paste the URL.
   - **ngrok**: Run `ngrok http 4000` and a small server that logs POST body on port 4000; use the ngrok URL.
2. Trigger a qualified lead (chat with the widget, provide intent/contact so the lead scores above threshold).
3. Check the webhook receiver: you should see a POST with payload like:
   - `leadId`, `siteDomain`, `capturedAt`, `contact`, `score`, `summary`, `transcriptUrl`.

If the worker is not running, the job stays in Redis until the worker runs (start with `pnpm --filter web worker`).

## Project structure

```
/
  apps/
    web/          # Next.js (dashboard, auth, API routes)
    widget/       # Vite bundle → leadbot.js
  packages/
    shared/       # Types, Zod schemas, scoring
  prisma/
  docker-compose.yml
  README.md
```

## Tests

- Unit tests for scoring: `packages/shared/src/scoring.test.ts` (you can add with Vitest/Jest).
- Integration test for webhook job: mock HTTP server + enqueue job + run worker (see `apps/web/src/lib/crm-worker.ts`).

## License

Private / use as needed.
