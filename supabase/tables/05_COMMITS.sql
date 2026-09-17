CREATE TABLE public.commits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.commits IS
  'Immutable commit metadata grouping the page revisions written together.';

CREATE INDEX commits_created_at_idx ON public.commits (created_at DESC);

ALTER TABLE public.commits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commits_select_authenticated"
  ON public.commits
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "commits_insert_authenticated"
  ON public.commits
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
