-- Add AI provider + profile columns to email_settings
-- Run in Supabase SQL Editor

alter table public.email_settings
  add column if not exists ai_provider text default 'anthropic',
  add column if not exists ai_api_key text,
  add column if not exists profile_role text,
  add column if not exists profile_company text;
