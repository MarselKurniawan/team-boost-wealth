
-- 1) Drop trigger pemberian tiket saat signup (penyebab user dapat tiket sebelum downline deposit)
DROP TRIGGER IF EXISTS trg_grant_spin_on_referral ON public.profiles;
DROP FUNCTION IF EXISTS public.grant_spin_on_referral();

-- 2) Hapus tiket belum-terpakai yang sumbernya referral tapi downline-nya
--    belum memenuhi syarat (belum deposit sukses ATAU belum beli produk).
DELETE FROM public.spin_tickets st
WHERE st.is_used = false
  AND st.source = 'referral'
  AND st.source_user_id IS NOT NULL
  AND (
    NOT EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.user_id = st.source_user_id
        AND t.type IN ('deposit','recharge')
        AND t.status IN ('success','approved','completed')
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.investments i WHERE i.user_id = st.source_user_id
    )
  );

-- 3) Hapus tiket duplikat (lebih dari satu tiket dari downline yang sama) yang belum dipakai
DELETE FROM public.spin_tickets st
USING (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, source_user_id, source ORDER BY created_at) AS rn
  FROM public.spin_tickets
  WHERE source = 'referral' AND source_user_id IS NOT NULL AND is_used = false
) dup
WHERE st.id = dup.id AND dup.rn > 1;
