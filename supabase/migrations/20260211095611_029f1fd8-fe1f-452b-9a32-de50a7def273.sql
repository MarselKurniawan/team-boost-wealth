
-- Update default vip_level for new profiles from 1 to 0
ALTER TABLE public.profiles ALTER COLUMN vip_level SET DEFAULT 0;

-- Update default vip_level for new products from 1 to 0
ALTER TABLE public.products ALTER COLUMN vip_level SET DEFAULT 0;

-- Update existing profiles with 0 team members to VIP 0
-- (users who currently have vip_level=1 but no referrals)
UPDATE public.profiles SET vip_level = 0 WHERE vip_level = 1;

-- Update existing products with vip_level=1 to vip_level=0
UPDATE public.products SET vip_level = 0 WHERE vip_level = 1;
