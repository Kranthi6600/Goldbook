-- ============================================================================
-- Gold Loan SaaS — Per-shop WhatsApp message templates
-- ============================================================================
-- HOW TO RUN: manually in Supabase SQL Editor (same as previous migrations).
--
-- Adds shops.whatsapp_templates (jsonb). Keys:
--   receipt, reminder_7d, reminder_3d, reminder_1d, overdue,
--   payment_confirm, statement
-- Placeholders rendered client/server-side by lib/utils/template.ts:
--   {{customer_name}} {{loan_number}} {{loan_amount}} {{total_due}}
--   {{due_date}} {{shop_name}} {{upi_link}} {{passbook_url}}
--   (+ {{payment_amount}} {{balance}} for payment_confirm, {{days}} for reminders)
--
-- The || operator merge fills only missing keys — existing edits are kept.
-- ============================================================================

alter table shops
  add column if not exists whatsapp_templates jsonb not null default '{}'::jsonb;

-- Backfill all 7 defaults on existing shops that never saved templates.
update shops
   set whatsapp_templates = whatsapp_templates || '{
     "receipt": "Gold Loan Receipt — {{shop_name}}\n\nLoan No: {{loan_number}}\nCustomer: {{customer_name}}\nAmount: {{loan_amount}}\nDue date: {{due_date}}\n\nPay via UPI: {{upi_link}}\nYour digital passbook: {{passbook_url}}\n\nThank you!",
     "reminder_7d": "Payment reminder — {{shop_name}}\n\nDear {{customer_name}},\nYour gold loan {{loan_number}} is due on {{due_date}}.\nAmount due: {{total_due}}\n\nPay via UPI: {{upi_link}}\nPassbook: {{passbook_url}}",
     "reminder_3d": "Payment reminder — {{shop_name}}\n\nDear {{customer_name}},\nYour gold loan {{loan_number}} is due on {{due_date}} (in {{days}} days).\nAmount due: {{total_due}}\n\nPay via UPI: {{upi_link}}\nPassbook: {{passbook_url}}",
     "reminder_1d": "Payment reminder — {{shop_name}}\n\nDear {{customer_name}},\nYour gold loan {{loan_number}} is due TOMORROW ({{due_date}}).\nAmount due: {{total_due}}\n\nPay via UPI: {{upi_link}}\nPassbook: {{passbook_url}}",
     "overdue": "OVERDUE — {{shop_name}}\n\nDear {{customer_name}},\nYour gold loan {{loan_number}} was due on {{due_date}} ({{days}} days overdue).\nAmount due: {{total_due}}\n\nPlease pay immediately via UPI: {{upi_link}}\nPassbook: {{passbook_url}}",
     "payment_confirm": "Payment received — {{shop_name}}\n\nDear {{customer_name}},\nWe received {{payment_amount}} for loan {{loan_number}}.\nRemaining balance: {{balance}}\n\nThank you!",
     "statement": "Loan statement — {{shop_name}}\n\nDear {{customer_name}},\nPlease find your statement for loan {{loan_number}} attached.\nBalance: {{total_due}}\n\nThank you!"
   }'::jsonb
 where whatsapp_templates is null
    or whatsapp_templates = '{}'::jsonb;
