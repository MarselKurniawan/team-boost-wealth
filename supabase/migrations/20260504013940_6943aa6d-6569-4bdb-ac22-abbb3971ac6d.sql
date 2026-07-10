
-- Spin tickets: tiap user dapat 1 tiket per referral berhasil
CREATE TABLE public.spin_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'referral',
  source_user_id UUID,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  reward_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.spin_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own spin tickets"
  ON public.spin_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own spin tickets"
  ON public.spin_tickets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage spin tickets"
  ON public.spin_tickets FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_spin_tickets_user ON public.spin_tickets(user_id, is_used);

-- Trigger: saat profile baru dengan referred_by terisi, beri 1 spin ticket ke upline
CREATE OR REPLACE FUNCTION public.grant_spin_on_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  upline_id UUID;
BEGIN
  IF NEW.referred_by IS NOT NULL AND NEW.referred_by <> '' THEN
    SELECT user_id INTO upline_id
    FROM public.profiles
    WHERE referral_code = NEW.referred_by
    LIMIT 1;

    IF upline_id IS NOT NULL THEN
      INSERT INTO public.spin_tickets (user_id, source, source_user_id)
      VALUES (upline_id, 'referral', NEW.user_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_referral_grant_spin
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.grant_spin_on_referral();
