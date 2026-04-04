-- Only admins may set or clear profiles.archived_at (patients cannot self-restore via API).
CREATE OR REPLACE FUNCTION public.profiles_block_archive_toggle_by_non_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.archived_at IS DISTINCT FROM NEW.archived_at THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only admins may archive or restore users'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_archived_guard ON public.profiles;
CREATE TRIGGER profiles_archived_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.profiles_block_archive_toggle_by_non_admin();
