-- ============================================================
-- SZN Dashboard — SEED DATA ONLY (matches actual schema)
-- ============================================================

-- Clients (no slug column — uses name, revenue_goal, calls_goal, active)
insert into public.clients (name, currency, revenue_goal, calls_goal, active) values
  ('SZN Media Group',  'USD', 100000, 150, true),
  ('Nexus Coaching',   'USD', 100000, 150, true),
  ('Alpha Elite Gyms', 'USD', 200000, 300, true);

-- Calls (client_id looked up by name, closer_id NULL until real users exist)
insert into public.calls (client_id, lead_name, lead_source, outcome, revenue, call_date) values
  ((select id from public.clients where name='SZN Media Group'),   'Marcus Johnson',  'Facebook',    'closed',      4800, current_date),
  ((select id from public.clients where name='SZN Media Group'),   'Sarah Whitfield', 'Organic',     'rescheduled', 0,    current_date),
  ((select id from public.clients where name='SZN Media Group'),   'Derek Mills',     'Facebook',    'lost',        0,    current_date),
  ((select id from public.clients where name='SZN Media Group'),   'Linda Torres',    'Referral',    'closed',      6200, current_date),
  ((select id from public.clients where name='SZN Media Group'),   'Kevin Park',      'Facebook',    'noshow',      0,    current_date),
  ((select id from public.clients where name='Nexus Coaching'),    'Rachel Kim',      'Organic',     'closed',      3800, current_date - 1),
  ((select id from public.clients where name='Nexus Coaching'),    'Tom Clarke',      'Facebook',    'lost',        0,    current_date - 1),
  ((select id from public.clients where name='Nexus Coaching'),    'Nina Shah',       'Cold Outreach','noshow',     0,    current_date - 1),
  ((select id from public.clients where name='Alpha Elite Gyms'),  'Dana Reyes',      'Instagram',   'closed',      8400, current_date - 1),
  ((select id from public.clients where name='Alpha Elite Gyms'),  'Sam Woods',       'Facebook',    'rescheduled', 0,    current_date - 1),
  ((select id from public.clients where name='SZN Media Group'),   'Amy Foster',      'Facebook',    'closed',      5500, current_date - 2),
  ((select id from public.clients where name='SZN Media Group'),   'Kyle Chen',       'Referral',    'lost',        0,    current_date - 2),
  ((select id from public.clients where name='Nexus Coaching'),    'Ryan Barrett',    'YouTube',     'closed',      2900, current_date - 2),
  ((select id from public.clients where name='Nexus Coaching'),    'Tara Walsh',      'Facebook',    'noshow',      0,    current_date - 2),
  ((select id from public.clients where name='Alpha Elite Gyms'),  'Emma Davis',      'Facebook',    'closed',      9200, current_date - 2),
  ((select id from public.clients where name='SZN Media Group'),   'Jasmine Lee',     'Facebook',    'closed',      5800, current_date - 3),
  ((select id from public.clients where name='Alpha Elite Gyms'),  'Priya Nair',      'Facebook',    'closed',      6600, current_date - 3),
  ((select id from public.clients where name='Nexus Coaching'),    'Omar Hassan',     'Cold Outreach','closed',     3500, current_date - 3),
  ((select id from public.clients where name='SZN Media Group'),   'Lena Morris',     'Organic',     'rescheduled', 0,    current_date - 3),
  ((select id from public.clients where name='Alpha Elite Gyms'),  'Brandon Cole',    'Facebook',    'closed',      5100, current_date - 4);

-- Ad Campaigns (uses cost_per_result instead of cpm/frequency/clicks)
insert into public.ad_campaigns (client_id, name, category, status, spend, impressions, reach, results, ctr, cost_per_result, roas, flagged) values
  ((select id from public.clients where name='SZN Media Group'),   'Scale_Core_Audience_Q3',     'Cold Traffic', 'active',   45210, 842000,  520000, 512, 2.8, 88.30,  4.8, false),
  ((select id from public.clients where name='SZN Media Group'),   'Retargeting_Abandoned_Cart', 'Retargeting',  'active',   12400, 150000,  88000,  314, 4.2, 39.49,  6.2, false),
  ((select id from public.clients where name='Nexus Coaching'),    'Lookalike_Top_5%_LTV',       'Lookalike',    'paused',   8000,  98000,   60000,  92,  1.1, 86.95,  3.1, false),
  ((select id from public.clients where name='Nexus Coaching'),    'Brand_Awareness_Q2',         'Brand',        'archived', 22100, 1200000, 700000, 89,  0.6, 248.31, 1.4, true),
  ((select id from public.clients where name='Alpha Elite Gyms'),  'Typeform_Leads_Summer',      'Typeform',     'active',   18650, 320000,  195000, 241, 3.4, 77.39,  5.1, false);

-- Daily metrics (create table first if missing, then seed)
create table if not exists public.daily_metrics (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients on delete cascade,
  metric_date date not null default current_date,
  revenue numeric default 0,
  calls_booked integer default 0,
  calls_completed integer default 0,
  deals_closed integer default 0,
  ad_spend numeric default 0,
  unique(client_id, metric_date)
);

alter table public.daily_metrics enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'daily_metrics' and policyname = 'Authenticated read daily_metrics'
  ) then
    execute 'create policy "Authenticated read daily_metrics" on public.daily_metrics for select using (auth.role() = ''authenticated'')';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'daily_metrics' and policyname = 'Authenticated insert daily_metrics'
  ) then
    execute 'create policy "Authenticated insert daily_metrics" on public.daily_metrics for insert with check (auth.role() = ''authenticated'')';
  end if;
end $$;

insert into public.daily_metrics (client_id, metric_date, revenue, calls_booked, calls_completed, deals_closed, ad_spend)
select
  c.id,
  (current_date - (n || ' days')::interval)::date,
  case when n=0 then 18400 when n=1 then 22400 when n=2 then 9800  when n=3 then 18600
       when n=4 then 12400 when n=5 then 15800 when n=6 then 21000 when n=7 then 17500
       when n=8 then 14200 when n=9 then 19800 when n=10 then 16400 when n=11 then 22100
       when n=12 then 11900 else 18700 end,
  case when n < 7 then 8 + (n % 3) else 6 + (n % 4) end,
  case when n < 7 then 6 + (n % 3) else 5 + (n % 3) end,
  case when n < 7 then 2 + (n % 2) else 1 + (n % 2) end,
  case when n < 7 then 4200 + (n * 120) else 3800 + (n * 100) end
from public.clients c, generate_series(0, 13) as n
on conflict (client_id, metric_date) do nothing;
