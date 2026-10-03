-- ============================================================================
-- Gold Loan SaaS — Initial Schema
-- ============================================================================
-- HOW TO RUN: This file is executed MANUALLY.
--   1. Open Supabase Dashboard -> SQL Editor
--   2. Paste the entire contents of this file
--   3. Run once against the project database (as postgres)
--
-- NOTES:
--   - pg_cron must be enabled/available in the project (Dashboard -> Database
--     -> Extensions). It is enabled in Supabase by default on most plans.
--   - All cron times are UTC (pg_cron does not support timezones).
--     00:05 IST = 18:35 UTC (previous day).
--   - RLS is enabled on EVERY table. Never disable it.
--   - Money is numeric. Due dates are date. Event timestamps are timestamptz.
-- ============================================================================

-- ============================================================================
-- SECTION A — Extensions
-- ============================================================================
create extension if not exists pgcrypto;
create extension if not exists pg_cron;

-- ============================================================================
-- SECTION B — Tables (dependency order)
-- ============================================================================

create table shops (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  phone         text not null,
  upi_id        text,
  logo_url      text,
  interest_mode text not null default 'simple'
                check (interest_mode in ('simple', 'compound')),
  plan          text not null default 'trial'
                check (plan in ('trial', 'starter', 'pro')),
  trial_ends_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table shop_staff (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references shops (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'staff',
  created_at timestamptz not null default now(),
  unique (shop_id, user_id)
);

create table customers (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references shops (id) on delete cascade,
  name       text not null,
  phone      text not null, -- stored as +91XXXXXXXXXX
  address    text,
  id_type    text,
  id_number  text,
  notes      text,
  created_at timestamptz not null default now(),
  unique (shop_id, phone)
);

create table slabs (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references shops (id) on delete cascade,
  min_amount   numeric not null,
  max_amount   numeric not null,
  rate_monthly numeric not null, -- percent per month
  created_at   timestamptz not null default now(),
  check (min_amount < max_amount)
);

create table loans (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references shops (id) on delete cascade,
  customer_id   uuid not null references customers (id) on delete restrict,
  loan_number   text not null,
  gold_weight_g numeric not null check (gold_weight_g > 0),
  gold_purity   text,
  loan_amount   numeric not null check (loan_amount > 0),
  rate_monthly  numeric not null, -- FROZEN at creation; never recalculated
  interest_mode text not null default 'simple'
                check (interest_mode in ('simple', 'compound')),
  start_date    date not null default current_date,
  due_date      date not null,
  status        text not null default 'active'
                check (status in ('active', 'closed', 'overdue', 'auctioned', 'written_off')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (shop_id, loan_number)
);

create table payments (
  id         uuid primary key default gen_random_uuid(),
  loan_id    uuid not null references loans (id) on delete cascade,
  shop_id    uuid not null references shops (id) on delete cascade,
  amount     numeric not null check (amount > 0),
  method     text not null default 'cash'
             check (method in ('cash', 'upi', 'bank', 'other')),
  reference  text,
  paid_at    timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table reminders (
  id           uuid primary key default gen_random_uuid(),
  loan_id      uuid not null references loans (id) on delete cascade,
  shop_id      uuid not null references shops (id) on delete cascade,
  kind         text not null, -- e.g. 'due_soon', 'overdue', 'receipt'
  channel      text not null default 'whatsapp', -- 'whatsapp' | 'sms'
  sent_at      timestamptz not null default now(),
  message_body text,
  created_at   timestamptz not null default now()
);

create table passbook_tokens (
  token       text primary key,
  customer_id uuid not null references customers (id) on delete cascade,
  shop_id     uuid not null references shops (id) on delete cascade,
  expires_at  timestamptz not null,
  revoked     boolean not null default false,
  created_at  timestamptz not null default now()
);

create table audit_log (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references shops (id) on delete cascade,
  actor_id   uuid, -- auth.users; null for system/service actions
  entity     text not null,
  entity_id  uuid,
  action     text not null, -- 'INSERT' | 'UPDATE' | 'DELETE'
  before     jsonb,
  after      jsonb,
  created_at timestamptz not null default now()
);

create table subscriptions (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null unique references shops (id) on delete cascade,
  plan       text not null default 'trial'
             check (plan in ('trial', 'starter', 'pro')),
  status     text not null default 'trialing'
             check (status in ('trialing', 'active', 'past_due', 'cancelled')),
  started_at timestamptz not null default now(),
  ends_at    timestamptz,
  created_at timestamptz not null default now()
);

create table leads (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid references shops (id) on delete set null, -- null for marketing leads
  name       text not null,
  phone      text not null,
  created_at timestamptz not null default now()
);

-- Indexes ----------------------------------------------------------------------
create index customers_shop_phone_idx  on customers (shop_id, phone);
create index customers_shop_name_idx   on customers (shop_id, name);
create index slabs_shop_min_idx        on slabs (shop_id, min_amount);
create index loans_shop_status_idx     on loans (shop_id, status);
create index loans_shop_due_date_idx   on loans (shop_id, due_date);
create index loans_customer_idx        on loans (customer_id);
create index payments_loan_idx         on payments (loan_id);
create index payments_shop_paid_idx    on payments (shop_id, paid_at);
create index reminders_loan_idx        on reminders (loan_id);
create index reminders_shop_sent_idx   on reminders (shop_id, sent_at);
create index passbook_tokens_cust_idx  on passbook_tokens (customer_id);
create index audit_log_shop_created_idx on audit_log (shop_id, created_at);

-- ============================================================================
-- SECTION C — SQL Functions
-- ============================================================================

-- Interest accrued. simple: P * r/100 * (d/30); compound: P * ((1+r/100)^(d/30) - 1)
create or replace function calc_interest(
  p_loan_amount  numeric,
  p_rate_monthly numeric,
  p_start_date   date,
  p_as_of_date   date,
  p_mode         text default 'simple'
) returns numeric
language plpgsql
immutable
as $$
declare
  v_days numeric;
begin
  v_days := p_as_of_date - p_start_date;
  if v_days < 0 then
    v_days := 0;
  end if;

  if p_mode = 'compound' then
    return round(p_loan_amount * (power(1 + p_rate_monthly / 100, v_days / 30) - 1));
  end if;

  return round(p_loan_amount * p_rate_monthly / 100 * (v_days / 30));
end;
$$;

-- Per-loan financial summary.
create or replace function loan_summary(p_loan_id uuid)
returns table (
  loan_amount      numeric,
  interest_accrued numeric,
  total_due        numeric,
  total_paid       numeric,
  balance          numeric,
  days_elapsed     integer,
  status           text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_loan loans%rowtype;
begin
  select * into v_loan from loans where id = p_loan_id;
  if not found then
    return;
  end if;

  days_elapsed     := greatest(current_date - v_loan.start_date, 0);
  loan_amount      := v_loan.loan_amount;
  interest_accrued := calc_interest(
                        v_loan.loan_amount,
                        v_loan.rate_monthly,
                        v_loan.start_date,
                        current_date,
                        v_loan.interest_mode
                      );
  total_due        := loan_amount + interest_accrued;

  select coalesce(sum(amount), 0) into total_paid
    from payments
   where loan_id = p_loan_id;

  balance := total_due - total_paid;
  status  := v_loan.status;
  return next;
end;
$$;

-- Monthly rate for a loan amount based on the shop's slab table.
-- Returns null when no slab matches.
create or replace function get_slab_rate(
  p_shop_id     uuid,
  p_loan_amount numeric
) returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rate numeric;
begin
  select rate_monthly into v_rate
    from slabs
   where shop_id = p_shop_id
     and min_amount <= p_loan_amount
     and max_amount >= p_loan_amount
   order by min_amount desc
   limit 1;

  return v_rate;
end;
$$;

-- Membership check used by RLS. SECURITY DEFINER so it can read shops/shop_staff
-- without tripping their own RLS policies. Owner OR staff counts as member.
create or replace function is_shop_member(p_shop_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from shops
     where id = p_shop_id
       and owner_id = auth.uid()
  ) or exists (
    select 1 from shop_staff
     where shop_id = p_shop_id
       and user_id = auth.uid()
  );
end;
$$;

-- ============================================================================
-- SECTION D — Row Level Security
-- ============================================================================
alter table shops           enable row level security;
alter table shop_staff      enable row level security;
alter table customers       enable row level security;
alter table slabs           enable row level security;
alter table loans           enable row level security;
alter table payments        enable row level security;
alter table reminders       enable row level security;
alter table passbook_tokens enable row level security;
alter table audit_log       enable row level security;
alter table subscriptions   enable row level security;
alter table leads           enable row level security;

-- shops: owner only ------------------------------------------------------------
create policy shops_owner_all on shops
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- shop_staff: user sees own row; shop members see the shop's staff -------------
create policy staff_self_select on shop_staff
  for select using (user_id = auth.uid());

create policy staff_member_all on shop_staff
  for all using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

-- Tenant tables: full access for shop members only ------------------------------
create policy customers_member_all on customers
  for all using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

create policy slabs_member_all on slabs
  for all using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

create policy loans_member_all on loans
  for all using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

create policy payments_member_all on payments
  for all using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

create policy reminders_member_all on reminders
  for all using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

create policy subscriptions_member_all on subscriptions
  for all using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

-- audit_log: read-only for shop members; writes happen only via the
-- SECURITY DEFINER audit trigger or the service role ---------------------------
create policy audit_log_member_select on audit_log
  for select using (is_shop_member(shop_id));

-- passbook_tokens: NO POLICY — deny-all for anon/authenticated.
-- Server-only access via the service role (borrower magic-link flow).

-- leads: public insert only (marketing/demo forms); no read access -------------
create policy leads_public_insert on leads
  for insert with check (true);

-- ============================================================================
-- SECTION E — Audit Trigger
-- ============================================================================
create or replace function audit_trigger_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id   uuid;
  v_entity_id uuid;
begin
  if TG_OP = 'DELETE' then
    v_shop_id   := OLD.shop_id;
    v_entity_id := OLD.id;
  else
    v_shop_id   := NEW.shop_id;
    v_entity_id := NEW.id;
  end if;

  insert into audit_log (shop_id, actor_id, entity, entity_id, action, before, after)
  values (
    v_shop_id,
    auth.uid(),
    TG_TABLE_NAME,
    v_entity_id,
    TG_OP,
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) end
  );

  return coalesce(NEW, OLD);
end;
$$;

create trigger audit_loans
  after insert or update or delete on loans
  for each row execute function audit_trigger_fn();

create trigger audit_payments
  after insert or update or delete on payments
  for each row execute function audit_trigger_fn();

create trigger audit_customers
  after insert or update or delete on customers
  for each row execute function audit_trigger_fn();

-- ============================================================================
-- SECTION F — Cron Jobs (pg_cron; all times UTC)
-- ============================================================================

-- 00:05 IST every day = 18:35 UTC. Marks active loans past due_date as overdue.
select cron.schedule(
  'mark-overdue',
  '35 18 * * *',
  $$update loans
       set status = 'overdue'
     where due_date < current_date
       and status = 'active'$$
);

-- 03:00 every Sunday (UTC). Revokes expired passbook tokens.
select cron.schedule(
  'cleanup-tokens',
  '0 3 * * 0',
  $$update passbook_tokens
       set revoked = true
     where expires_at < now()
       and revoked = false$$
);
