-- =============================================================================
-- One-time: make ONLY this email an admin (run in Supabase SQL Editor)
-- Prerequisite: user must already exist (sign up in the app OR Auth → Add user)
-- Do NOT store passwords in this file — set the password in Supabase Auth only.
-- =============================================================================

UPDATE public.profiles
SET role = 'patient'
WHERE role = 'admin';

UPDATE public.profiles AS p
SET role = 'admin'
FROM auth.users AS u
WHERE p.id = u.id
  AND lower(u.email) = lower('jasmine@admin.com');

-- Verify
SELECT u.email, p.role
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'admin' OR lower(u.email) = lower('jasmine@admin.com');
