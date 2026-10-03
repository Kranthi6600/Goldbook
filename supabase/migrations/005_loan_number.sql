-- ============================================================================
-- Gold Loan SaaS — Loan creation support
-- ============================================================================
-- HOW TO RUN: manually in Supabase SQL Editor (same as previous migrations).
-- (Named 005 — migrations 002/003/004 are already taken.)
--
-- 1. shop_counters table: per-shop, per-year loan number sequences.
-- 2. get_next_loan_number(p_shop_id): atomic upsert + row lock → GL-YYYY-NNNN.
-- 3. loans.gold_description column (needed by the loan form).
-- 4. passbook_tokens member policy: shop members must read/create tokens to
--    share passbook links with borrowers (was service-role-only).
-- ============================================================================

create table if not exists shop_counters (
  shop_id     uuid    not null references shops(id) on delete cascade,
  year        integer not null,
  last_number integer not null default 0,
  created_at  timestamptz not null default now(),
  primary key (shop_id, year)
);

alter table shop_counters enable row level security;

-- Members can read counters; writes happen inside the SECURITY DEFINER function.
create policy shop_counters_member_select on shop_counters
  for select using (is_shop_member(shop_id));

-- Atomic per (shop_id, year): concurrent callers serialize on the conflict row.
create or replace function get_next_loan_number(p_shop_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := extract(year from current_date)::int;
  v_next integer;
begin
  insert into shop_counters (shop_id, year, last_number)
  values (p_shop_id, v_year, 1)
  on conflict (shop_id, year)
  do update set last_number = shop_counters.last_number + 1
  returning last_number into v_next;

  return 'GL-' || v_year || '-' || lpad(v_next::text, 4, '0');
end;
$$;

-- Gold item description on loans.
alter table loans add column if not exists gold_description text;

-- Members need to create/read tokens to share passbook links via WhatsApp.
create policy passbook_tokens_member_all on passbook_tokens
  for all using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));
