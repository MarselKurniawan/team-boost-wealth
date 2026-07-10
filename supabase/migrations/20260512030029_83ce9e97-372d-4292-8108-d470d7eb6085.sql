-- Pasang trigger handle_new_user di auth.users supaya profile + role otomatis dibuat
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill profil yang hilang untuk user existing
INSERT INTO public.profiles (user_id, email, name, phone, referral_code, referred_by,
  balance, total_income, total_recharge, total_withdraw, team_income, rabat_income, vip_level)
SELECT
  u.id,
  COALESCE(u.email, ''),
  COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'phone', ''),
  COALESCE(u.raw_user_meta_data->>'phone', ''),
  upper(substr(md5(random()::text || u.id::text), 1, 8)),
  COALESCE(u.raw_user_meta_data->>'referred_by', ''),
  0, 0, 0, 0, 0, 0, 0
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL
ON CONFLICT DO NOTHING;

-- Backfill default role 'user'
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.id IS NULL
ON CONFLICT DO NOTHING;