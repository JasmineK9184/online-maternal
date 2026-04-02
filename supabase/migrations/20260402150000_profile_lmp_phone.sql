ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lmp_date DATE,
  ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN public.profiles.lmp_date IS 'Last menstrual period (optional; used if due_date not set)';
