
-- Spin wheel rewards (admin-configurable)
CREATE TABLE IF NOT EXISTS public.spin_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1,
  fill TEXT NOT NULL DEFAULT 'hsl(217 90% 58%)',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.spin_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view spin rewards" ON public.spin_rewards FOR SELECT USING (true);
CREATE POLICY "Admins manage spin rewards" ON public.spin_rewards FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Seed defaults
INSERT INTO public.spin_rewards (label, amount, weight, fill, sort_order) VALUES
('1K', 1000, 35, 'hsl(217 90% 58%)', 1),
('2K', 2000, 28, 'hsl(199 89% 48%)', 2),
('3K', 3000, 17, 'hsl(217 90% 50%)', 3),
('5K', 5000, 10, 'hsl(231 80% 55%)', 4),
('10K', 10000, 5, 'hsl(217 90% 42%)', 5),
('15K', 15000, 3, 'hsl(262 70% 55%)', 6),
('25K', 25000, 1.5, 'hsl(38 92% 50%)', 7),
('50K', 50000, 0.5, 'hsl(45 96% 55%)', 8);

-- Legality documents (certificates / izin perusahaan)
CREATE TABLE IF NOT EXISTS public.company_legality (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  document_number TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Aktif',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.company_legality ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view legality" ON public.company_legality FOR SELECT USING (true);
CREATE POLICY "Admins manage legality" ON public.company_legality FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Public bucket for legality documents
INSERT INTO storage.buckets (id, name, public) VALUES ('legality', 'legality', true)
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public read legality" ON storage.objects FOR SELECT USING (bucket_id = 'legality');
CREATE POLICY "Admins upload legality" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'legality' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update legality" ON storage.objects FOR UPDATE USING (bucket_id = 'legality' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete legality" ON storage.objects FOR DELETE USING (bucket_id = 'legality' AND has_role(auth.uid(), 'admin'));
