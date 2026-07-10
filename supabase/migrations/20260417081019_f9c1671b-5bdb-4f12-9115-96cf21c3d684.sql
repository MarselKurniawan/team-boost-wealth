
-- 1) Function untuk auto-create profile saat user baru daftar via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_referral TEXT;
  meta_phone TEXT;
  meta_name TEXT;
  meta_referred_by TEXT;
BEGIN
  -- Generate unique referral code (retry kalau bentrok)
  LOOP
    new_referral := upper(substr(md5(random()::text || NEW.id::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_referral);
  END LOOP;

  meta_phone := COALESCE(NEW.raw_user_meta_data ->> 'phone', '');
  meta_name := COALESCE(NEW.raw_user_meta_data ->> 'name', meta_phone);
  meta_referred_by := COALESCE(NEW.raw_user_meta_data ->> 'referred_by', '');

  INSERT INTO public.profiles (
    user_id, email, name, phone, referral_code, referred_by,
    balance, total_income, total_recharge, total_withdraw,
    team_income, rabat_income, vip_level
  ) VALUES (
    NEW.id, NEW.email, meta_name, meta_phone, new_referral, meta_referred_by,
    0, 0, 0, 0, 0, 0, 0
  )
  ON CONFLICT DO NOTHING;

  -- Default role: user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2) Trigger di auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Backfill profile untuk auth.users yang belum punya profile
INSERT INTO public.profiles (
  user_id, email, name, phone, referral_code, referred_by,
  balance, total_income, total_recharge, total_withdraw,
  team_income, rabat_income, vip_level
)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'phone', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data ->> 'phone', ''),
  upper(substr(md5(random()::text || u.id::text), 1, 8)),
  COALESCE(u.raw_user_meta_data ->> 'referred_by', ''),
  0, 0, 0, 0, 0, 0, 0
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- 4) Backfill role default 'user' untuk yang belum punya role
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL;

-- 5) Jadikan user 081225697928 sebagai admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE email = '081225697928@wa.investpro.id'
ON CONFLICT (user_id, role) DO NOTHING;
