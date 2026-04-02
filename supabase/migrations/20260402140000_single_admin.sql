-- At most one row may have role = 'admin' (second admin UPDATE/INSERT will fail).
CREATE UNIQUE INDEX IF NOT EXISTS profiles_single_admin
  ON public.profiles (role)
  WHERE role = 'admin';
