-- ============================================================================
-- Gold Loan SaaS — Lock financial writes (interest-manipulation fix)
-- ============================================================================
-- loans_member_all / payments_member_all (migration 001) granted members full
-- insert/update/delete. Via the public API a shop could:
--   * UPDATE loans.rate_monthly / start_date  → retroactively rewrite interest
--   * UPDATE loans.loan_amount                → change principal after issue
--   * UPDATE/DELETE payments                  → erase or rewrite collections
--   * DELETE loans                            → wipe debts
-- Server actions never touch financial fields after creation — they only set
-- status/closed_at/updated_at on loans and INSERT payments. So the fix is:
--   loans:    member select/insert/update (no delete) + immutability trigger
--             on every financial field
--   payments: member select/insert only (no update, no delete)
-- Service role keeps full access for admin corrections.
-- ============================================================================

-- LOANS ---------------------------------------------------------------------
drop policy if exists loans_member_all on loans;

create policy loans_member_select on loans
  for select using (is_shop_member(shop_id));

create policy loans_member_insert on loans
  for insert with check (is_shop_member(shop_id));

create policy loans_member_update on loans
  for update
  using (is_shop_member(shop_id))
  with check (is_shop_member(shop_id));

-- No delete policy → delete is denied for members.
-- Financial-field immutability lives in 020_financial_integrity.sql.

-- PAYMENTS ------------------------------------------------------------------
drop policy if exists payments_member_all on payments;

create policy payments_member_select on payments
  for select using (is_shop_member(shop_id));

create policy payments_member_insert on payments
  for insert with check (is_shop_member(shop_id));

-- No update or delete policy → collections are append-only for members.
-- Corrections must go through the service role or a new compensating row.

-- SHOPS ---------------------------------------------------------------------
-- shops_owner_all lets an owner UPDATE their own row — including plan and
-- trial_ends_at. That is self-activation: flip plan='active', push the trial
-- out to 2999, never pay. Keep owner writes for settings fields but freeze
-- the two billing fields; admins (activate_subscription) and service role
-- keep write access.
create or replace function shops_billing_immutable()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' or is_admin() then
    return new;
  end if;

  if new.plan          is distinct from old.plan
     or new.trial_ends_at is distinct from old.trial_ends_at
  then
    raise exception 'plan and trial_ends_at are admin-managed';
  end if;

  return new;
end;
$$;

drop trigger if exists shops_billing_immutable_trg on shops;
create trigger shops_billing_immutable_trg
  before update on shops
  for each row execute function shops_billing_immutable();
