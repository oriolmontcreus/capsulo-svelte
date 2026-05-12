CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

COMMENT ON TABLE public.user_profiles IS 'Perfiles de usurios vinculados a auth.users.';

CREATE INDEX user_profiles_active_idx ON public.user_profiles (id) WHERE deleted_at IS NULL;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select_all"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (true);
