
-- Create OTP codes table
CREATE TABLE public.otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Allow anonymous insert (before user is authenticated, OTP is requested)
CREATE POLICY "Anyone can insert OTP codes" ON public.otp_codes
  FOR INSERT WITH CHECK (true);

-- Allow anonymous select for verification
CREATE POLICY "Anyone can verify OTP codes" ON public.otp_codes
  FOR SELECT USING (true);

-- Allow anonymous update for marking as verified
CREATE POLICY "Anyone can update OTP codes" ON public.otp_codes
  FOR UPDATE USING (true);

-- Auto-cleanup: delete expired OTPs older than 1 hour
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.otp_codes WHERE expires_at < now() - interval '1 hour';
END;
$$;
