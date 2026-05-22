-- Add 'spam' as a valid lead status
-- Run this in Supabase SQL Editor

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('active', 'replied', 'unsubscribed', 'spam'));
