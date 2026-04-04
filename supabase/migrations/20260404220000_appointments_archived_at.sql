-- Soft-archive appointments (hidden from active lists); record retained for audit.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN public.appointments.archived_at IS 'When set, visit is hidden from patient dashboard and admin scheduling lists.';

CREATE INDEX IF NOT EXISTS idx_appointments_archived_at ON public.appointments (archived_at)
  WHERE archived_at IS NOT NULL;

-- Treat archived appointments like freed slots for patient booking visibility.
DROP POLICY IF EXISTS "availability_slots_select_unbooked" ON public.availability_slots;

CREATE POLICY "availability_slots_select_unbooked"
  ON public.availability_slots FOR SELECT
  TO authenticated
  USING (
    archived_at IS NULL
    AND start_time > NOW()
    AND NOT EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.slot_id = availability_slots.id
        AND a.status <> 'cancelled'
        AND a.archived_at IS NULL
    )
  );
