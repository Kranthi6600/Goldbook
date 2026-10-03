-- ============================================================================
-- Gold Loan SaaS — Passbook view tracking
-- ============================================================================
-- HOW TO RUN: manually in Supabase SQL Editor (same as previous migrations).
-- (Named 008 — migrations 002–007 are already taken.)
--
-- Adds view analytics columns to passbook_tokens and an RPC to record views.
-- log_passbook_view is SECURITY DEFINER — intended to be called with the
-- service-role client from server-side code only.
-- ============================================================================

alter table passbook_tokens
  add column if not exists view_count integer not null default 0,
  add column if not exists last_viewed_at timestamptz;

create or replace function log_passbook_view(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update passbook_tokens
     set view_count = view_count + 1,
         last_viewed_at = now()
   where token = p_token
     and revoked = false
     and expires_at > now();
end;
$$;
