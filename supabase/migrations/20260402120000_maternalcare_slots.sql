-- MaternalCare Sync: bookable clinic slots + reminder tracking

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

-- Future slots that are not yet booked (patients)
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

-- Sample slots (next few days, morning blocks) — adjust in production
INSERT INTO public.availability_slots (start_time, end_time, label)
SELECT
  (date_trunc('day', NOW() AT TIME ZONE 'UTC') + interval '1 day' + make_interval(hours => 9 + (gs * 2))),
  (date_trunc('day', NOW() AT TIME ZONE 'UTC') + interval '1 day' + make_interval(hours => 9 + (gs * 2), mins => 30)),
  'MaternalCare clinic'
FROM generate_series(0, 3) AS gs;
