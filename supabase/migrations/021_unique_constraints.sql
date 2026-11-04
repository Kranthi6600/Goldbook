-- ============================================================================
-- Add unique constraints to prevent duplicates
-- ============================================================================

-- Add unique constraint on shops.phone to prevent duplicate phone numbers
-- This ensures no two shops can have the same phone number
alter table shops
add constraint shops_phone_unique unique (phone);

-- Note: customers already has unique (shop_id, phone) in migration 001
-- Note: auth.users already enforces unique email at the Supabase auth level
