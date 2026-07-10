
-- Create VIP settings table
CREATE TABLE public.vip_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vip_level integer NOT NULL UNIQUE,
  required_members integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vip_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read VIP settings (needed for client-side VIP checks)
CREATE POLICY "Anyone can view vip settings"
ON public.vip_settings FOR SELECT
USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage vip settings"
ON public.vip_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default thresholds
INSERT INTO public.vip_settings (vip_level, required_members) VALUES
  (1, 10),
  (2, 50),
  (3, 100),
  (4, 200),
  (5, 300);
