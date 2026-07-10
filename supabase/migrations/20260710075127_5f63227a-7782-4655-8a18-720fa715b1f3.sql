
-- 1) Revoke EXECUTE from anon+authenticated on all SECURITY DEFINER helpers,
--    then re-grant EXECUTE only on the ones the client legitimately calls.
REVOKE EXECUTE ON FUNCTION public.claim_investment_atomic(uuid)      FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_otps()             FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrement_product_stock(uuid, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code()           FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_long_term_investors(uuid[])    FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_referral_code()             FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_team()                      FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_referral_team(text)            FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_spin_if_qualified(uuid)      FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                  FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role)           FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_investment_claimed()        FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_investment_created()        FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_referral_signup()           FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_transaction_created()       FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_transaction_updated()       FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_spin_on_deposit()              FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()         FROM anon, authenticated, PUBLIC;

-- Re-grant EXECUTE only to authenticated for functions actually called by the app
GRANT EXECUTE ON FUNCTION public.claim_investment_atomic(uuid)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_product_stock(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_long_term_investors(uuid[])     TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_referral_code()              TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_team()                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_team(text)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role)            TO authenticated;

-- 2) Coupons: stop exposing unused coupon codes to every signed-in user.
DROP POLICY IF EXISTS "Users can view available coupons" ON public.coupons;
CREATE POLICY "Users can view coupons they redeemed"
ON public.coupons
FOR SELECT
TO authenticated
USING (used_by = auth.uid());

-- 3) Storage: remove broad SELECT (list) policies on public buckets.
--    Files stay reachable via public object URLs; the bucket is just no longer listable.
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Public read legality" ON storage.objects;
