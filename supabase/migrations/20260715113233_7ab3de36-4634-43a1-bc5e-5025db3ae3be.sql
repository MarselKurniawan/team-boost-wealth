CREATE OR REPLACE FUNCTION public.notify_transaction_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  t TEXT; m TEXT;
BEGIN
  IF NEW.type = 'deposit' OR NEW.type = 'recharge' THEN
    t := 'Permintaan Deposit Diajukan';
    m := 'Deposit Rp ' || to_char(NEW.amount, 'FM999G999G999G999') || ' sedang diproses admin.';
  ELSIF NEW.type = 'withdraw' OR NEW.type = 'withdrawal' THEN
    t := 'Permintaan Penarikan Diajukan';
    m := 'Penarikan Rp ' || to_char(NEW.amount, 'FM999G999G999G999') || ' sedang diproses (1-24 jam, setiap hari).';
  ELSE
    RETURN NEW;
  END IF;
  PERFORM public.create_notification(NEW.user_id, NEW.type, t, m,
    jsonb_build_object('transaction_id', NEW.id, 'amount', NEW.amount));
  RETURN NEW;
END;
$function$;