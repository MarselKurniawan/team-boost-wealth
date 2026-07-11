
ALTER TABLE public.vip_settings ADD COLUMN IF NOT EXISTS title text;

INSERT INTO public.vip_settings (vip_level, required_members, required_deposit, title)
VALUES
  (0, 0, 0, 'Pemula'),
  (1, 0, 0, 'Asisten Magang'),
  (2, 0, 0, 'Kepala Pemasaran'),
  (3, 0, 0, 'Asisten Manager'),
  (4, 0, 0, 'Supervisor'),
  (5, 0, 0, 'Manager')
ON CONFLICT (vip_level) DO UPDATE SET title = COALESCE(public.vip_settings.title, EXCLUDED.title);
