-- ============================================================================
-- Gold Loan SaaS — Payment kind classification
-- ============================================================================
-- HOW TO RUN: manually in Supabase SQL Editor (same as previous migrations).
--
-- payments.kind classifies each payment: 'interest' | 'principal' | 'mixed'.
-- Interest collected is tracked separately from principal — the daily-book
-- and compliance exports can then split the two.
-- Existing rows default to 'mixed' (we can't retro-classify them).
-- ============================================================================

alter table payments
  add column if not exists kind text not null default 'mixed'
  check (kind in ('interest', 'principal', 'mixed'));
