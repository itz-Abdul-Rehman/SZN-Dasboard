# SZN Marketing Agency Dashboard

Internal operations dashboard for a digital marketing agency. Tracks sales performance, ad campaigns, client goals, and team metrics — with AI-powered insights and automated Slack alerts.

## Stack

- **Next.js 14** App Router + TypeScript
- **Supabase** (PostgreSQL + Row Level Security)
- **Groq** (LLaMA 3.3 70B) for AI insights and report narratives
- **Meta Graph API** for ad campaign sync
- **Slack API** for automated alerts and daily digests
- **Tailwind CSS** with custom design tokens
- **Vercel** deployment

## Features

- **Master Dashboard** — KPI cards, revenue chart, top performer, AI insights stream
- **Sales** — Revenue chart, log calls, objection tracking, close rate
- **Call Logs** — Paginated table, AI loss debrief (streams per call + posts to Slack)
- **Ads** — Meta campaign table, one-click sync, flagged campaigns
- **Setter Dashboard** — Daily activity logging, booking rate tracking
- **Lead Tagging** — Tag leads by pipeline stage
- **Leaderboard** — Closer revenue + close rate, setter booking rate
- **Reports** — AI-generated reports with date-range filtering, PDF download
- **Settings** — Client goals, Slack connection, Meta sync status

## Role-Based Access

| Role | Access |
|------|--------|
| Admin | Everything |
| Closer | Dashboard, Call Logs, Lead Tagging, Leaderboard |
| Setter | Dashboard, Setter page |
| Client | Dashboard only |

## Setup

1. Clone the repo
2. Copy `.env.local.example` → `.env.local` and fill in all keys
3. Run `supabase-schema.sql` in Supabase SQL Editor
4. Run `supabase/seed-only.sql` for sample data
5. `npm install && npm run dev`

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GROQ_API_KEY
META_APP_ID / META_APP_SECRET / META_ACCESS_TOKEN / META_AD_ACCOUNT_ID
SLACK_BOT_TOKEN / SLACK_CHANNEL_ID
EXCHANGE_RATE_API_KEY
```

## Cron Jobs

Configured in `vercel.json` (Vercel Pro) or via [cron-job.org](https://cron-job.org) for free:

| Job | Schedule |
|-----|----------|
| Anomaly detection → Slack | Every 4 hours |
| Daily targets → Slack DMs | 8:00 AM daily |
| Meta campaign sync | Every hour |
| Auto report generation | 11:59 PM daily |
