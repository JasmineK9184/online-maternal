-- MaternalCare Sync — Pending approval workflow
-- Adds:
--  - status = 'pending'
--  - appointment email audit columns
--  - patient_email snapshot for later email sends

-- 1) Update status check constraint to allow 'pending'
-- In this project the constraint is typically named `appointments_status_check`.
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pending', 'scheduled', 'cancelled', 'completed'));

-- 2) Snapshot patient email so server can email later without auth.user lookups
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS patient_email TEXT;

-- 3) Idempotency / audit for emails
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS booking_confirmation_sent_at TIMESTAMPTZ;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS booking_approved_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_appointments_pending_confirmation
  ON public.appointments (booking_confirmation_sent_at);

CREATE INDEX IF NOT EXISTS idx_appointments_pending_approved
  ON public.appointments (booking_approved_sent_at);

