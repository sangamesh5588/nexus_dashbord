-- Multi-user index migration
-- Run this in the Supabase SQL editor after the previous multi-user migration
-- This changes the leads unique constraint from (email) → (email, user_id)
-- so each user can have the same lead email in their own pool without conflict.

-- 1. Drop the old single-column email unique index
drop index if exists public.leads_email_unique;

-- 2. Create a composite unique index: each user's lead pool is deduplicated by email
create unique index if not exists leads_email_user_unique
  on public.leads(email, user_id);

-- Done. Now two different users can both have info@example.com as a lead,
-- but the same user cannot add the same email twice.
