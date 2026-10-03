-- ============================================================================
-- Gold Loan SaaS — Reminder attribution
-- ============================================================================
-- HOW TO RUN: manually in Supabase SQL Editor (same as previous migrations).
-- reminders.sent_by records which staff member clicked "send" on a reminder.
-- ============================================================================

alter table reminders
  add column if not exists sent_by uuid references auth.users(id);
