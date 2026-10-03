-- ============================================================================
-- Gold Loan SaaS — Payment support columns
-- ============================================================================
-- HOW TO RUN: manually in Supabase SQL Editor (same as previous migrations).
--
-- 1. payments.notes — free-text note shown on receipts/audit.
-- 2. loans.closed_at — set when a loan is fully paid / closed.
-- ============================================================================

alter table payments add column if not exists notes text;
alter table loans add column if not exists closed_at timestamptz;
