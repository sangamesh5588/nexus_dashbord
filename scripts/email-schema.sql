-- Email Automation Schema
-- Run this in the Supabase SQL editor

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  company text,
  custom_note text,
  status text not null default 'active' check (status in ('active', 'replied', 'unsubscribed')),
  upload_batch text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists leads_email_unique on public.leads(email);

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  step integer not null check (step in (1, 2, 3)),
  subject text not null,
  body text not null,
  delay_days integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  campaign_id uuid references public.email_campaigns(id) on delete set null,
  step integer not null,
  subject text not null,
  body text not null,
  status text not null default 'sent' check (status in ('sent', 'failed', 'replied')),
  gmail_thread_id text,
  gmail_message_id text,
  error_message text,
  sent_at timestamptz not null default now()
);
create index if not exists email_logs_lead_id_idx on public.email_logs(lead_id);
create index if not exists email_logs_thread_id_idx on public.email_logs(gmail_thread_id);

create table if not exists public.email_settings (
  id integer primary key default 1 check (id = 1),
  gmail_address text,
  gmail_app_password text,
  sender_display_name text,
  ai_persona_bio text,
  gmail_oauth_access_token text,
  gmail_oauth_refresh_token text,
  gmail_oauth_token_expiry timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.email_settings (id) values (1) on conflict (id) do nothing;
