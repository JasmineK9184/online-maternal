-- Soft-archive slots (hidden from patient booking); hard delete still supported for admins.
ALTER TABLE public.availability_slots
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN public.availability_slots.archived_at IS 'When set, slot is hidden from the public booking list; admin may restore.';

CREATE INDEX IF NOT EXISTS idx_availability_slots_archived_at ON public.availability_slots (archived_at)
  WHERE archived_at IS NOT NULL;

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
    )
  );
