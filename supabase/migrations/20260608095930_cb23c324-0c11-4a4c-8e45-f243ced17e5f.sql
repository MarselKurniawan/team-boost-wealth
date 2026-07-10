DROP TRIGGER IF EXISTS trg_grant_spin_on_referral ON public.profiles;
CREATE TRIGGER trg_grant_spin_on_referral
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.grant_spin_on_referral();

INSERT INTO public.spin_tickets (user_id, source, source_user_id)
SELECT up.user_id, 'referral', dn.user_id
FROM public.profiles dn
JOIN public.profiles up ON up.referral_code = dn.referred_by
WHERE dn.referred_by IS NOT NULL
  AND dn.referred_by <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.spin_tickets st
    WHERE st.user_id = up.user_id
      AND st.source = 'referral'
      AND st.source_user_id = dn.user_id
  );