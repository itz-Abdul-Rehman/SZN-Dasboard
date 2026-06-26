# SZN Marketing Agency Dashboard — Project Context

## What This Is
A full-stack internal operations dashboard for a digital marketing agency. Built for agency admins, closers, setters, and clients. Tracks sales performance, ad campaigns, lead outcomes, and client goals — with AI-powered insights and automated Slack alerts.

## Tech Stack
- **Framework**: Next.js 14 App Router (`src/` directory, TypeScript)
- **Database**: Supabase (PostgreSQL + RLS) via `@supabase/ssr`
- **Styling**: Tailwind CSS with custom design tokens in `tailwind.config.ts`
- **AI**: Groq SDK — `llama-3.3-70b-versatile` for reports, `llama-3.1-8b-instant` for streaming
- **Alerts**: Slack API (`chat.postMessage`) via Bot Token
- **Ads**: Meta Graph API v19 (campaigns + insights)
- **Currency**: ExchangeRate-API v6 with 6-hour in-memory cache
- **Deployment**: Vercel (crons via cron-job.org for free tier)

## Role-Based Access
Four roles enforced in `src/middleware.ts`:
- `admin` — full access to all routes
- `closer` — `/dashboard`, `/dashboard/call-logs`, `/dashboard/lead-tagging`, `/dashboard/leaderboard`
- `setter` — `/dashboard`, `/dashboard/setter`
- `client` — `/dashboard` only

Middleware reads `profiles.role` from Supabase. No profile = treated as admin.

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
    cron/anomaly-check/route.ts    — 4-hourly anomaly detection → Slack
    cron/daily-targets/route.ts    — daily 8am Slack DMs to closers/setters
    settings/goals/route.ts        — GET/PATCH client goals
    slack/test/route.ts            — test Slack connection
    exchange-rate/route.ts         — currency rates endpoint
```

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

## Cron Jobs (vercel.json — requires Pro, use cron-job.org for free)
| Endpoint | Schedule | Purpose |
|---|---|---|
| `/api/cron/anomaly-check` | every 4 hours | Detects >20%/>35% metric deviations, Slack alert |
| `/api/cron/daily-targets` | 8am daily | Personalized Slack DMs to each closer/setter |
| `/api/meta/sync` | every hour | Pulls Meta campaign data into Supabase |
| `/api/reports/generate` | 11:59pm daily | Auto-generates daily report |

All cron endpoints export `GET` alias of their `POST` handler.

## Report Date Filtering
`/api/reports/generate` accepts `{ dateFrom?, dateTo?, reportTitle? }` in POST body. When provided, all Supabase queries filter to that date range. The reports page passes each static report entry's specific `dateFrom`/`dateTo` so clicking Download fetches that period's data — not today's.

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
```

## Design Tokens (Tailwind)
Custom colors used throughout: `brand`, `secondary`, `warning`, `danger`, `success`, `primary`, `on-primary`. Surfaces: `surface`, `surface-low`, `surface-high`, `surface-highest`, `surface-container`. Text: `on-surface`, `on-surface-variant`. All defined in `tailwind.config.ts`.

## Seed Data
Run `supabase/seed-only.sql` in Supabase SQL Editor after applying `supabase-schema.sql` to get 3 clients and sample calls/ads/metrics.

## Local Dev
```bash
npm install
npm run dev   # http://localhost:3000
```
