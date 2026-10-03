-- ============================================================================
-- Gold Loan SaaS — Lock subscriptions writes (P0 security fix)
-- ============================================================================
-- RUN THIS BEFORE 017_manual_billing.sql.
--
-- subscriptions_member_all (migration 001) granted shop members full
-- insert/update/delete on their own subscription rows — a shop could
-- self-activate via the public API and never pay. The activate_subscription
-- RPC gate is meaningless while this hole exists.
--
-- Fix: members get SELECT only. All writes flow through
-- activate_subscription (SECURITY DEFINER + is_admin) or the service role.
-- ============================================================================

drop policy if exists subscriptions_member_all on subscriptions;

create policy subscriptions_member_read on subscriptions
  for select using (is_shop_member(shop_id));

-- No insert/update/delete policies for anon or authenticated.
-- Only service_role and SECURITY DEFINER functions can write.
