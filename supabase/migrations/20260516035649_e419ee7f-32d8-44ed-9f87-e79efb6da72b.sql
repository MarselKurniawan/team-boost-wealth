
-- Remove overly-permissive OTP policies. Edge functions use service_role which bypasses RLS.
DROP POLICY IF EXISTS "Anyone can insert OTP codes" ON public.otp_codes;
DROP POLICY IF EXISTS "Anyone can update OTP codes" ON public.otp_codes;
DROP POLICY IF EXISTS "Anyone can verify OTP codes" ON public.otp_codes;

-- Deny all direct client access. send-otp / verify-otp edge functions already use service_role.
CREATE POLICY "No direct OTP access"
ON public.otp_codes FOR SELECT
USING (false);
