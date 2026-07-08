# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# SZN Marketing Agency Dashboard — Project Context

## What This Is
A full-stack internal operations dashboard for a digital marketing agency. Built for agency admins, closers, setters, and clients. Tracks sales performance, ad campaigns, lead outcomes, and client goals — with AI-powered insights and automated Slack alerts.

## Commands
```bash
npm run dev      # http://localhost:3000
npm run build    # production build (also type-checks)
npm run lint     # ESLint via next lint
npm run start    # serve production build
```
No test framework is configured.

## Tech Stack
- **Framework**: Next.js 14 App Router (`src/` directory, TypeScript)
- **Database**: Supabase (PostgreSQL + RLS) via `@supabase/ssr`
- **Styling**: Tailwind CSS with custom design tokens in `tailwind.config.ts`
- **AI**: Groq SDK — `llama-3.3-70b-versatile` for reports, `llama-3.1-8b-instant` for streaming
- **Alerts**: Slack API (`chat.postMessage`) via Bot Token
- **Ads**: Meta Graph API v19 (campaigns + insights)
- **Currency**: ExchangeRate-API v6 with 6-hour in-memory cache
- **Email**: Resend SMTP via Supabase Auth (password reset + invites)
- **Deployment**: AWS Lightsail — PM2 process manager, cron via the server's system crontab (NOT Vercel)

## Role-Based Access
Four roles enforced in `src/middleware.ts`:
- `admin` — full access to all routes
- `closer` — `/dashboard`, `/dashboard/call-logs`, `/dashboard/lead-tagging`, `/dashboard/leaderboard`
- `setter` — `/dashboard`, `/dashboard/setter`
- `client` — `/dashboard` only

Middleware reads `profiles.role` from Supabase. No profile = treated as admin.

## Supabase Client Pattern
Three clients — pick based on context:
- `src/lib/supabase/client.ts` → `createClient()` — browser components (uses anon key)
- `src/lib/supabase/server.ts` → `createClient()` — Server Components / Route Handlers (uses anon key + cookies)
- `src/lib/supabase/server.ts` → `createAdminClient()` — Route Handlers that need to bypass RLS (uses service role key)

All Supabase query functions live in `src/lib/db/queries.ts`. Add new queries there rather than inlining them in pages.

## Database Tables (see `supabase-schema.sql`)
- `profiles` — extends auth.users, stores role + full_name + slack_user_id
- `clients` — agency clients with revenue_goal, calls_goal, currency
- `calls` — every sales call: outcome, revenue, lead info, closer_id, objection
- `ad_campaigns` — Meta campaigns synced hourly
- `daily_metrics` — daily rollups for charts and anomaly detection
- `setter_logs` — setter activity (conversations, replies, calls_booked)
- `settings` — key/value store for agency-wide config

## Key Files
```
src/
  middleware.ts                    — role-based route protection
  lib/
    db/queries.ts                  — all Supabase query functions
    db/types.ts                    — TypeScript types for DB rows
    slack.ts                       — sendSlackMessage + message builders
    meta.ts                        — Meta Graph API helpers
    exchange-rate.ts               — currency conversion with 6hr cache
    utils.ts                       — cn() classname helper
  app/
    dashboard/page.tsx             — master KPI dashboard with streaming AI
    dashboard/ads/page.tsx         — ad campaigns table + Meta sync
    dashboard/call-logs/page.tsx   — paginated call log + AI loss debrief
    dashboard/sales/page.tsx       — sales charts + log call modal
    dashboard/setter/page.tsx      — setter activity dashboard
    dashboard/lead-tagging/page.tsx — tag leads by pipeline stage
    dashboard/leaderboard/page.tsx  — closer + setter leaderboard
    dashboard/reports/page.tsx     — AI-generated reports + PDF download
    dashboard/settings/page.tsx    — goals, Slack, Meta connection settings
  api/
    dashboard/route.ts             — master KPI + chart data endpoint
    ai/insights/route.ts           — streaming AI insights + next-action
    ai/loss-debrief/route.ts       — streaming loss debrief → Slack
    ai/campaign-narrative/route.ts — streaming ad narrative
    reports/generate/route.ts      — full report with date-range filtering
    meta/sync/route.ts             — upsert Meta campaigns to Supabase
    cron/anomaly-check/route.ts    — 4-hourly anomaly detection (from calls) → Slack
    cron/daily-targets/route.ts    — daily 8am targets + fame/shame leaderboard → Slack
    settings/goals/route.ts        — GET/PATCH client goals
    settings/route.ts              — GET/PATCH agency settings (AI personality, thresholds)
    users/route.ts                 — admin: list / invite-by-email / update role+status
    calls/reassign/route.ts        — admin: reassign a call to another closer
    slack/test/route.ts            — test Slack connection
    exchange-rate/route.ts         — currency rates endpoint
  lib/cron-auth.ts                 — assertCron() guard (CRON_SECRET) for cron endpoints
```

Cron endpoints use `createAdminClient()` (they run with no user session). AI
insights/loss-debrief read the saved AI personality via `getAiToneInstruction()`.
The `/reset-password` page + login "Forgot password?" drive the Supabase email flow.

## Streaming Pattern
AI endpoints use `ReadableStream` + Groq async iterator:
```typescript
const stream = new ReadableStream({ async start(controller) {
  const groqStream = await groq.chat.completions.create({ ..., stream: true });
  for await (const chunk of groqStream) {
    const text = chunk.choices[0]?.delta?.content ?? "";
    if (text) controller.enqueue(new TextEncoder().encode(text));
  }
  controller.close();
}});
return new Response(stream, { headers: { "Content-Type": "text/plain" } });
```
Client reads with `getReader()` + `TextDecoder` and appends to state.

## Cron Jobs (server system crontab on Lightsail — curls `localhost:3000`)
| Endpoint | Schedule | Purpose | Guard |
|---|---|---|---|
| `/api/meta/sync` | every hour | Pulls Meta campaigns + 90-day daily spend into Supabase | none |
| `/api/cron/anomaly-check` | every 4 hours | >warn%/>35% deviations (from calls) → Slack | `?key=$CRON_SECRET` |
| `/api/cron/daily-targets` | 8am daily | Per-user targets + fame/shame leaderboard → Slack | `?key=$CRON_SECRET` |
| `/api/reports/generate` | 11:59pm daily | Auto-generates daily report + Slack summary | none |

Cron endpoints export a `GET` alias. Guarded ones call `assertCron()` — a no-op
until `CRON_SECRET` is set, then require the key. Crontab logs to `/home/admin/cron.log`.

## Report Date Filtering
`/api/reports/generate` accepts `{ dateFrom?, dateTo?, reportTitle? }` in POST body. When provided, all Supabase queries filter to that date range. The reports page's Daily/Weekly/Monthly buttons pass the matching range (`rangeFor()`); the old hardcoded report list was removed.

## Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GROQ_API_KEY
META_APP_ID
META_APP_SECRET
META_ACCESS_TOKEN
META_AD_ACCOUNT_ID
SLACK_BOT_TOKEN
SLACK_CHANNEL_ID
EXCHANGE_RATE_API_KEY
CRON_SECRET            # guards /api/cron/* (anomaly-check, daily-targets)
```

## Data Flow Notes (KPIs)
- Sales/master/setter KPIs compute live from `calls` / `setter_logs` (source of truth).
- Meta sync writes per-day USD `ad_spend` into `daily_metrics` and archives 90 days
  into `ad_metrics_history`. Revenue trend chart reads `calls`; ad-spend chart reads
  `daily_metrics`. Ad spend + leaderboard/attribution revenue are USD-converted.
- Master ROAS uses month-to-date `daily_metrics.ad_spend` (period-consistent).
- See `kpi_calculations.md` for the canonical per-card formulas.

## Design Tokens (Tailwind)
Custom colors used throughout: `brand`, `secondary`, `warning`, `danger`, `success`, `primary`, `on-primary`. Surfaces: `surface`, `surface-low`, `surface-high`, `surface-highest`, `surface-container`. Text: `on-surface`, `on-surface-variant`. All defined in `tailwind.config.ts`.

## Seed Data
Run `supabase/seed-only.sql` in Supabase SQL Editor after applying `supabase-schema.sql` to get 3 clients and sample calls/ads/metrics.
