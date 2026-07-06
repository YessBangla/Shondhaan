ALTER TABLE services
  ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER price;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS platform_fee_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER payment_status;

UPDATE bookings
SET platform_fee_amount = COALESCE(payment_amount, 0)
WHERE platform_fee_amount = 0;
