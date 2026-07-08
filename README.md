# SZN Marketing Agency Dashboard

Internal operations dashboard for a digital marketing agency. Tracks sales performance, ad campaigns, client goals, and team metrics — with AI-powered insights and automated Slack alerts.

## Stack

- **Next.js 14** App Router + TypeScript
- **Supabase** (PostgreSQL + Row Level Security)
- **Groq** (LLaMA 3.3 70B) for AI insights and report narratives
- **Meta Graph API** for ad campaign sync (+ 90-day daily spend history)
- **Slack API** for automated alerts, digests, and celebrations
- **Resend (SMTP)** for password-reset + invite emails via Supabase Auth
- **Tailwind CSS** with custom design tokens
- **AWS Lightsail** deployment (PM2 process manager + system crontab)

## Features

- **Master Dashboard** — KPI cards with today-vs-yesterday trend arrows, revenue chart, top performer, AI insights stream
- **Sales** — Revenue chart, log calls, objection tracking, close rate, big-deal Slack celebrations
- **Call Logs** — Paginated table, AI loss debrief (streams per call + posts to Slack), admin lead reassignment
- **Ads** — Meta campaign table, one-click sync, flagged campaigns, real daily-spend chart
- **Setter Dashboard** — Daily activity logging, booking rate, streak milestones (Slack)
- **Lead Tagging** — Tag leads by pipeline stage
- **Leaderboard** — Closer revenue + close/show-up rate, setter booking rate; shame/fame posted to Slack
- **Reports** — AI-generated reports with date-range filtering, PDF download, Slack delivery on the daily run
- **Settings** — Client goals, AI personality, alert thresholds, and user management (invite by email + role/status) — all persisted
- **Auth** — Login, password reset via email, admin invites

## Role-Based Access

| Role | Access |
|------|--------|
| Admin | Everything |
| Closer | Dashboard, Call Logs, Lead Tagging, Leaderboard |
| Setter | Dashboard, Setter page |
| Client | Dashboard only |

## Setup

1. Clone the repo
2. Create `.env.local` and fill in all keys (see below)
3. Run `supabase-schema.sql` in Supabase SQL Editor
4. (Optional) Run `supabase/seed-only.sql` for sample data
5. `npm install && npm run dev`

For emails to send, configure custom SMTP (e.g. Resend) in Supabase → Authentication → Emails, and add your app URL under Authentication → URL Configuration (Site URL + Redirect URLs including `/reset-password`).

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GROQ_API_KEY
META_APP_ID / META_APP_SECRET / META_ACCESS_TOKEN / META_AD_ACCOUNT_ID
SLACK_BOT_TOKEN / SLACK_CHANNEL_ID
EXCHANGE_RATE_API_KEY
CRON_SECRET          # guards the cron endpoints (see below)
```

## Deployment

Runs on **AWS Lightsail** under **PM2** (`pm2 start npm --name szn-dashboard -- start`).
Deploy = `git pull` → `npm run build` → `pm2 restart szn-dashboard`.
Add ~2 GB swap on small instances so the Next build doesn't OOM.

## Cron Jobs

Scheduled via the server's **system crontab** (curl to `localhost:3000`). Guarded
endpoints require `?key=$CRON_SECRET`.

| Job | Endpoint | Schedule | Guarded |
|-----|----------|----------|---------|
| Meta campaign sync | `/api/meta/sync` | Every hour | no (also UI Sync button) |
| Anomaly detection → Slack | `/api/cron/anomaly-check` | Every 4 hours | yes |
| Daily targets + leaderboard → Slack | `/api/cron/daily-targets` | 8:00 AM daily | yes |
| Auto report generation → Slack | `/api/reports/generate` | 11:59 PM daily | no (also UI) |
