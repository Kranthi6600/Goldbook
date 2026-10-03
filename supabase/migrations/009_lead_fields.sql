-- ============================================================================
-- Gold Loan SaaS — Demo-form lead fields
-- ============================================================================
-- HOW TO RUN: manually in Supabase SQL Editor (same as previous migrations).
-- The leads_public_insert policy already exists; this only adds columns for
-- the richer demo request form.
-- ============================================================================

alter table leads
  add column if not exists shop_name text,
  add column if not exists city text,
  add column if not exists active_pledges text,
  add column if not exists current_method text,
  add column if not exists source text not null default 'website';
