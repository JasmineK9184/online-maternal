-- Track due-date reminder emails to avoid duplicate sends
CREATE TABLE IF NOT EXISTS public.due_reminders (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, reminder_date)
);

CREATE INDEX IF NOT EXISTS idx_due_reminders_date ON public.due_reminders (reminder_date);

