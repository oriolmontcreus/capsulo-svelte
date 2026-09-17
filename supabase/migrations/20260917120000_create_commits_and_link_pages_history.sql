-- Groups page revisions into a single commit so the History page can show
-- "this commit touched pages A, B and C" as one entry instead of N unrelated
-- rows that happen to share a message and a timestamp.

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

-- Append-only, exactly like pages-history: no UPDATE/DELETE policy.
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

ALTER TABLE public."pages-history"
  ADD COLUMN commit_id uuid REFERENCES public.commits (id) ON DELETE SET NULL;

CREATE INDEX pages_history_commit_id_idx ON public."pages-history" (commit_id);

-- Backfill: every revision written before this migration becomes its own
-- single-page commit, so the History page has one source of truth and never
-- has to merge orphan revisions into the commit list.
-- Runs as the table owner, so the missing UPDATE policy does not block it.
DO $$
DECLARE
  revision record;
  new_commit_id uuid;
BEGIN
  FOR revision IN
    SELECT id, comment, created_by, created_at
    FROM public."pages-history"
    WHERE commit_id IS NULL
    ORDER BY id
  LOOP
    INSERT INTO public.commits (message, created_by, created_at)
    VALUES (
      COALESCE(NULLIF(btrim(revision.comment), ''), 'Saved from editor'),
      revision.created_by,
      revision.created_at
    )
    RETURNING id INTO new_commit_id;

    UPDATE public."pages-history"
    SET commit_id = new_commit_id
    WHERE id = revision.id;
  END LOOP;
END $$;
