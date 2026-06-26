-- ============================================================
-- NEW SZN Agency Dashboard — Full Database Schema
-- Run this entire file in Supabase > SQL Editor > New Query
-- ============================================================

-- 1. PROFILES (extends auth.users with role + display info)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('admin', 'closer', 'setter', 'client')),
  client_id uuid,
  avatar_initials text,
  active boolean default true,
  created_at timestamptz default now()
);

-- 2. CLIENTS (agency customers)
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text default 'USD',
  revenue_goal numeric default 100000,
  calls_goal integer default 150,
  active boolean default true,
  created_at timestamptz default now()
);

-- Add foreign key from profiles to clients
alter table public.profiles
  add constraint profiles_client_id_fkey
  foreign key (client_id) references public.clients(id) on delete set null;

-- 3. CALLS (every sales call logged)
create table public.calls (
  id uuid primary key default gen_random_uuid(),
  closer_id uuid references public.profiles(id) on delete set null,
  client_id uuid references public.clients(id) on delete cascade,
  lead_name text not null,
  lead_source text default 'Facebook',
  outcome text not null check (outcome in ('closed', 'rescheduled', 'lost', 'noshow')),
  revenue numeric default 0,
  notes text,
  objection text,
  tag text default 'follow-up' check (tag in ('closed','follow-up','hot-follow-up','no-show','declined','rescheduled')),
  call_date date default current_date,
  call_time time default current_time,
  created_at timestamptz default now()
);

-- 4. SETTER LOGS (daily outreach activity)
create table public.setter_logs (
  id uuid primary key default gen_random_uuid(),
  setter_id uuid references public.profiles(id) on delete cascade,
  log_date date default current_date,
  conversations integer default 0,
  replies integer default 0,
  proposals integer default 0,
  calls_booked integer default 0,
  follow_ups integer default 0,
  created_at timestamptz default now(),
  unique(setter_id, log_date)
);

-- 5. AD CAMPAIGNS (Facebook/Meta)
create table public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  name text not null,
  status text default 'active' check (status in ('active','paused','archived')),
  category text default 'Cold Traffic',
  spend numeric default 0,
  impressions bigint default 0,
  reach bigint default 0,
  results integer default 0,
  ctr numeric default 0,
  cost_per_result numeric default 0,
  roas numeric default 0,
  flagged boolean default false,
  flag_reason text,
  meta_campaign_id text,
  last_synced_at timestamptz,
  created_at timestamptz default now()
);

-- 6. AD METRICS HISTORY (daily snapshots for charts)
create table public.ad_metrics_history (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.ad_campaigns(id) on delete cascade,
  metric_date date default current_date,
  spend numeric default 0,
  impressions bigint default 0,
  results integer default 0,
  ctr numeric default 0,
  created_at timestamptz default now()
);

-- 7. AI REPORTS
create table public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  report_type text check (report_type in ('daily','weekly','monthly')),
  title text not null,
  narrative text,
  file_url text,
  file_size text,
  generated_at timestamptz default now()
);

-- 8. SETTINGS (per client config)
create table public.settings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade unique,
  ai_personality text default 'Coach' check (ai_personality in ('Coach','Analyst','Strategist','Motivator')),
  close_rate_threshold numeric default 20,
  rpc_drop_threshold numeric default 30,
  slack_reports_channel text,
  slack_alerts_channel text,
  slack_leaderboard_channel text,
  slack_coaching_channel text,
  updated_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.calls enable row level security;
alter table public.setter_logs enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.ad_metrics_history enable row level security;
alter table public.ai_reports enable row level security;
alter table public.settings enable row level security;

-- Helper function: get current user's role
create or replace function public.get_my_role()
returns text language sql security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Helper function: get current user's client_id
create or replace function public.get_my_client_id()
returns uuid language sql security definer
as $$
  select client_id from public.profiles where id = auth.uid();
$$;

-- PROFILES policies
create policy "Users can view own profile"
  on public.profiles for select using (id = auth.uid());
create policy "Admins can view all profiles"
  on public.profiles for select using (get_my_role() = 'admin');
create policy "Users can update own profile"
  on public.profiles for update using (id = auth.uid());
create policy "Admins can insert profiles"
  on public.profiles for insert with check (get_my_role() = 'admin');

-- CLIENTS policies
create policy "Admins see all clients"
  on public.clients for all using (get_my_role() = 'admin');
create policy "Clients see own client"
  on public.clients for select using (id = get_my_client_id());
create policy "Closers/Setters see all clients"
  on public.clients for select using (get_my_role() in ('closer','setter'));

-- CALLS policies
create policy "Admins see all calls"
  on public.calls for all using (get_my_role() = 'admin');
create policy "Closers see own calls"
  on public.calls for select using (closer_id = auth.uid());
create policy "Closers insert own calls"
  on public.calls for insert with check (closer_id = auth.uid());
create policy "Closers update own calls"
  on public.calls for update using (closer_id = auth.uid());
create policy "Clients see own client calls"
  on public.calls for select using (client_id = get_my_client_id() and get_my_role() = 'client');

-- SETTER LOGS policies
create policy "Admins see all setter logs"
  on public.setter_logs for all using (get_my_role() = 'admin');
create policy "Setters see own logs"
  on public.setter_logs for select using (setter_id = auth.uid());
create policy "Setters insert own logs"
  on public.setter_logs for insert with check (setter_id = auth.uid());
create policy "Setters update own logs"
  on public.setter_logs for update using (setter_id = auth.uid());

-- AD CAMPAIGNS policies
create policy "Admins see all campaigns"
  on public.ad_campaigns for all using (get_my_role() = 'admin');
create policy "All authenticated see campaigns"
  on public.ad_campaigns for select using (auth.uid() is not null);

-- AD METRICS HISTORY policies
create policy "All authenticated see ad history"
  on public.ad_metrics_history for select using (auth.uid() is not null);
create policy "Admins manage ad history"
  on public.ad_metrics_history for all using (get_my_role() = 'admin');

-- AI REPORTS policies
create policy "Admins manage reports"
  on public.ai_reports for all using (get_my_role() = 'admin');
create policy "Clients see own reports"
  on public.ai_reports for select using (client_id = get_my_client_id());

-- SETTINGS policies
create policy "Admins manage settings"
  on public.settings for all using (get_my_role() = 'admin');

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, avatar_initials)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'closer'),
    upper(left(coalesce(new.raw_user_meta_data->>'full_name', new.email), 2))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- SEED DATA — Insert your first admin user after running this
-- Go to Supabase > Authentication > Users > Add User
-- Then run: UPDATE public.profiles SET role = 'admin' WHERE id = '<your-user-id>';
-- ============================================================
