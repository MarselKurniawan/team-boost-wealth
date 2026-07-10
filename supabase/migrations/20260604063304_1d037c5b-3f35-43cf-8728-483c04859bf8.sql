
-- 1. Tighten coupon RLS: hapus policy update yang terlalu longgar
DROP POLICY IF EXISTS "Users can use coupons" ON public.coupons;

-- 2. Tambah kolom attempts untuk OTP brute-force protection
ALTER TABLE public.otp_codes
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
