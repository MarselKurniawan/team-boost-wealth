
-- Ensure every auth user has a profile via trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing profiles for existing auth users
INSERT INTO public.profiles (user_id, email, name, phone, referral_code, balance, total_income, total_recharge, total_withdraw, team_income, rabat_income, vip_level)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'phone', split_part(u.email,'@',1)),
  COALESCE(u.raw_user_meta_data->>'phone', split_part(u.email,'@',1)),
  upper(substr(md5(random()::text || u.id::text), 1, 8)),
  0,0,0,0,0,0,0
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL
ON CONFLICT DO NOTHING;

-- Ensure default 'user' role exists for everyone (admin role stays as set)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::app_role FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'user'
WHERE r.user_id IS NULL
ON CONFLICT DO NOTHING;
