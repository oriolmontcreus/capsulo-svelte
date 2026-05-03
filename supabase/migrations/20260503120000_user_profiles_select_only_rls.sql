-- Read-only SELECT for logged-in users only

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select_all"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (true);
