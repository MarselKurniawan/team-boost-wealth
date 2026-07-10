-- Coupons: support multi-use codes
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_uses integer NOT NULL DEFAULT 1;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS current_uses integer NOT NULL DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS reward_min numeric NOT NULL DEFAULT 100;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS reward_max numeric NOT NULL DEFAULT 1000;

-- Backfill current_uses for existing used coupons
UPDATE public.coupons SET current_uses = 1 WHERE is_used = true AND current_uses = 0;

-- Track per-user redemptions to prevent double-claim
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reward_amount numeric NOT NULL DEFAULT 0,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coupon_id, user_id)
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own redemptions" ON public.coupon_redemptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own redemptions" ON public.coupon_redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage redemptions" ON public.coupon_redemptions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Products: max purchase per user (NULL = unlimited)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS max_per_user integer DEFAULT 1;