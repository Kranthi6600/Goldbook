-- ============================================================================
-- Gold Loan SaaS — Lead pipeline status
-- ============================================================================
-- HOW TO RUN: manually in Supabase SQL Editor (same as previous migrations).
-- Adds the status column the admin leads pipeline updates inline.
-- ============================================================================

alter table leads
  add column if not exists status text not null default 'new'
    check (status in ('new', 'contacted', 'demo', 'onboarded', 'lost'));
