-- Maternal Appointment & Milestone System
-- Enable pgcrypto for encryption helpers (app uses Node crypto; this is for gen_random_uuid if needed)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Gestational age in weeks from due_date (40-week model). Use in SELECT: pregnancy_week(due_date)
CREATE OR REPLACE FUNCTION public.pregnancy_week(p_due DATE)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT CASE
    WHEN p_due IS NULL THEN NULL
    ELSE GREATEST(
      0,
      LEAST(42, FLOOR(40::NUMERIC - (p_due - CURRENT_DATE) / 7.0)::INTEGER)
    )
  END;
$$;

-- Profiles: one row per auth user (current week = pregnancy_week(due_date) at query time)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'admin')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Encrypted Google OAuth refresh token (server-only decrypt)
CREATE TABLE public.user_google_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  encrypted_refresh_token TEXT NOT NULL,
  token_iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('pending', 'scheduled', 'cancelled', 'completed')),
  google_event_id TEXT,
  patient_email TEXT,
  appointment_type TEXT NOT NULL,
  is_telehealth BOOLEAN NOT NULL DEFAULT FALSE,
  booking_confirmation_sent_at TIMESTAMPTZ,
  booking_approved_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT appointments_time_order CHECK (end_time > start_time)
);

CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL UNIQUE CHECK (week_number >= 0 AND week_number <= 42),
  title TEXT NOT NULL,
  description TEXT
);

-- Seed example milestones
INSERT INTO public.milestones (week_number, title, description) VALUES
  (8, 'First prenatal / early ultrasound', 'Schedule first prenatal visit and dating scan.'),
  (12, 'First trimester screening', 'Discuss NIPT or first-trimester screening options.'),
  (20, 'Anatomy scan', 'Detailed ultrasound to review baby''s growth and anatomy.'),
  (24, 'Glucose screening', 'One-hour glucose challenge; follow-up if indicated.'),
  (28, 'Third trimester check-in', 'Rhogam if needed; discuss birth plan.'),
  (36, 'Weekly checkups begin', 'Closer monitoring as you approach due date.')
ON CONFLICT (week_number) DO NOTHING;

CREATE INDEX idx_appointments_patient ON public.appointments (patient_id);
CREATE INDEX idx_appointments_start ON public.appointments (start_time);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- Helper: is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

-- Profiles policies
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_admin());

-- Google tokens: only service role / server should write; users cannot read raw tokens from client
-- Block all client access; server uses service role or SECURITY DEFINER if needed
CREATE POLICY "user_google_tokens_no_client"
  ON public.user_google_tokens FOR ALL
  USING (false);

-- Appointments
CREATE POLICY "appointments_select_own_or_admin"
  ON public.appointments FOR SELECT
  USING (patient_id = auth.uid() OR public.is_admin());

CREATE POLICY "appointments_insert_own_or_admin"
  ON public.appointments FOR INSERT
  WITH CHECK (patient_id = auth.uid() OR public.is_admin());

CREATE POLICY "appointments_update_own_or_admin"
  ON public.appointments FOR UPDATE
  USING (patient_id = auth.uid() OR public.is_admin());

CREATE POLICY "appointments_delete_own_or_admin"
  ON public.appointments FOR DELETE
  USING (patient_id = auth.uid() OR public.is_admin());

-- Milestones: read for authenticated users; admin can manage
CREATE POLICY "milestones_select_authenticated"
  ON public.milestones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "milestones_admin_all"
  ON public.milestones FOR ALL
  USING (public.is_admin());

-- Trigger: new user profile row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();

CREATE TRIGGER appointments_updated
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();
