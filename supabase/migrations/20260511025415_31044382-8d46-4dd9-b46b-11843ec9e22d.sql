-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all notifications" ON public.notifications
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Helper to insert notification (bypass RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID, _type TEXT, _title TEXT, _message TEXT, _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (_user_id, _type, _title, _message, _metadata);
END;
$$;

-- Trigger: investment created (purchase)
CREATE OR REPLACE FUNCTION public.notify_investment_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.create_notification(
    NEW.user_id,
    'investment_purchase',
    'Pembelian Produk Berhasil',
    'Anda berhasil membeli ' || NEW.product_name || ' senilai Rp ' || to_char(NEW.amount, 'FM999G999G999G999') || '. Profit harian akan masuk otomatis.',
    jsonb_build_object('investment_id', NEW.id, 'amount', NEW.amount, 'product_name', NEW.product_name)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_investment_created
AFTER INSERT ON public.investments
FOR EACH ROW EXECUTE FUNCTION public.notify_investment_created();

-- Trigger: investment claimed (last_claimed_at updated)
CREATE OR REPLACE FUNCTION public.notify_investment_claimed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  earned NUMERIC;
BEGIN
  IF NEW.last_claimed_at IS DISTINCT FROM OLD.last_claimed_at AND NEW.last_claimed_at IS NOT NULL THEN
    earned := COALESCE(NEW.total_earned, 0) - COALESCE(OLD.total_earned, 0);
    IF earned > 0 THEN
      PERFORM public.create_notification(
        NEW.user_id,
        'profit_claimed',
        'Profit Harian Diklaim',
        'Profit sebesar Rp ' || to_char(earned, 'FM999G999G999G999') || ' dari ' || NEW.product_name || ' telah masuk ke saldo Anda.',
        jsonb_build_object('investment_id', NEW.id, 'amount', earned)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_investment_claimed
AFTER UPDATE ON public.investments
FOR EACH ROW EXECUTE FUNCTION public.notify_investment_claimed();

-- Trigger: transaction created (deposit/withdraw request)
CREATE OR REPLACE FUNCTION public.notify_transaction_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t TEXT; m TEXT;
BEGIN
  IF NEW.type = 'deposit' OR NEW.type = 'recharge' THEN
    t := 'Permintaan Deposit Diajukan';
    m := 'Deposit Rp ' || to_char(NEW.amount, 'FM999G999G999G999') || ' sedang diproses admin.';
  ELSIF NEW.type = 'withdraw' OR NEW.type = 'withdrawal' THEN
    t := 'Permintaan Penarikan Diajukan';
    m := 'Penarikan Rp ' || to_char(NEW.amount, 'FM999G999G999G999') || ' sedang diproses (12-48 jam Senin-Sabtu).';
  ELSE
    RETURN NEW;
  END IF;
  PERFORM public.create_notification(NEW.user_id, NEW.type, t, m,
    jsonb_build_object('transaction_id', NEW.id, 'amount', NEW.amount));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_transaction_created
AFTER INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.notify_transaction_created();

-- Trigger: transaction status updated
CREATE OR REPLACE FUNCTION public.notify_transaction_updated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t TEXT; m TEXT; label TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','completed','rejected','failed') THEN
    label := CASE WHEN NEW.type IN ('deposit','recharge') THEN 'Deposit'
                  WHEN NEW.type IN ('withdraw','withdrawal') THEN 'Penarikan'
                  ELSE INITCAP(NEW.type) END;
    IF NEW.status IN ('approved','completed') THEN
      t := label || ' Berhasil';
      m := label || ' Rp ' || to_char(NEW.amount, 'FM999G999G999G999') || ' telah disetujui.';
    ELSE
      t := label || ' Ditolak';
      m := label || ' Rp ' || to_char(NEW.amount, 'FM999G999G999G999') || ' ditolak. Hubungi CS jika ada pertanyaan.';
    END IF;
    PERFORM public.create_notification(NEW.user_id, NEW.type || '_' || NEW.status, t, m,
      jsonb_build_object('transaction_id', NEW.id, 'amount', NEW.amount, 'status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_transaction_updated
AFTER UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.notify_transaction_updated();

-- Trigger: new referral signup
CREATE OR REPLACE FUNCTION public.notify_referral_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  upline_id UUID;
BEGIN
  IF NEW.referred_by IS NOT NULL AND NEW.referred_by <> '' THEN
    SELECT user_id INTO upline_id FROM public.profiles WHERE referral_code = NEW.referred_by LIMIT 1;
    IF upline_id IS NOT NULL THEN
      PERFORM public.create_notification(upline_id, 'referral_signup',
        'Anggota Tim Baru', 'Selamat! ' || COALESCE(NEW.name, 'Anggota baru') || ' bergabung di tim Anda.',
        jsonb_build_object('new_user_id', NEW.user_id));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_referral_signup
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_referral_signup();