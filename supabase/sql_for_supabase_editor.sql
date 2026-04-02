-- =============================================================================
-- MaternalCare Sync — run in Supabase: SQL Editor → New query → Run
-- Use on a NEW project, OR run only the sections you are missing.
-- If a table already exists, skip that migration or you will see errors.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- SECTION 1 — Initial schema (profiles, appointments, milestones, RLS, …)
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'admin')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  google_event_id TEXT,
  appointment_type TEXT NOT NULL,
  is_telehealth BOOLEAN NOT NULL DEFAULT FALSE,
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "user_google_tokens_no_client"
  ON public.user_google_tokens FOR ALL
  USING (false);

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

CREATE POLICY "milestones_select_authenticated"
  ON public.milestones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "milestones_admin_all"
  ON public.milestones FOR ALL
  USING (public.is_admin());

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


-- ---------------------------------------------------------------------------
-- SECTION 2 — Availability slots + appointment columns + RLS
-- ---------------------------------------------------------------------------

CREATE TABLE public.availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT availability_slots_time_order CHECK (end_time > start_time)
);

CREATE INDEX idx_availability_slots_start ON public.availability_slots (start_time);

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS slot_id UUID REFERENCES public.availability_slots (id) ON DELETE SET NULL;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE UNIQUE INDEX idx_appointments_one_active_per_slot
  ON public.appointments (slot_id)
  WHERE slot_id IS NOT NULL AND status <> 'cancelled';

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_slots_select_unbooked"
  ON public.availability_slots FOR SELECT
  TO authenticated
  USING (
    start_time > NOW()
    AND NOT EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.slot_id = availability_slots.id
        AND a.status <> 'cancelled'
    )
  );

CREATE POLICY "availability_slots_select_admin"
  ON public.availability_slots FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "availability_slots_admin_insert"
  ON public.availability_slots FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "availability_slots_admin_update"
  ON public.availability_slots FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "availability_slots_admin_delete"
  ON public.availability_slots FOR DELETE
  TO authenticated
  USING (public.is_admin());

INSERT INTO public.availability_slots (start_time, end_time, label)
SELECT
  (date_trunc('day', NOW() AT TIME ZONE 'UTC') + interval '1 day' + make_interval(hours => 9 + (gs * 2))),
  (date_trunc('day', NOW() AT TIME ZONE 'UTC') + interval '1 day' + make_interval(hours => 9 + (gs * 2), mins => 30)),
  'MaternalCare clinic'
FROM generate_series(0, 3) AS gs;


-- ---------------------------------------------------------------------------
-- SECTION 3 — Make YOUR user an admin (replace the UUID)
-- Find UUID: Supabase → Authentication → Users → copy User UID
-- ---------------------------------------------------------------------------

-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = 'PASTE-YOUR-USER-UUID-HERE';
