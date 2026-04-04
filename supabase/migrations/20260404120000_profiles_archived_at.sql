-- Soft-archive patients: archived users cannot use the dashboard (signed out on entry).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_archived_at ON public.profiles (archived_at)
  WHERE archived_at IS NOT NULL;

COMMENT ON COLUMN public.profiles.archived_at IS 'When set, patient is archived and blocked from dashboard.';
