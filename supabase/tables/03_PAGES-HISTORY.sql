CREATE TABLE public."pages-history" (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  page_id text NOT NULL REFERENCES public.pages (page_id) ON DELETE CASCADE,
  content jsonb NOT NULL,
  content_format_version integer NOT NULL DEFAULT 1 CHECK (content_format_version >= 1),
  comment text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pages_history_content_object_check
    CHECK (jsonb_typeof(content) = 'object')
);

COMMENT ON TABLE public."pages-history" IS
  'Immutable snapshots of Page Editor content captured on explicit save.';

CREATE INDEX pages_history_page_created_at_idx
  ON public."pages-history" (page_id, created_at DESC);

ALTER TABLE public."pages-history" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pages_history_select_authenticated"
  ON public."pages-history"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "pages_history_insert_authenticated"
  ON public."pages-history"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
