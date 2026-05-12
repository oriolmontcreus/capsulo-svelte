CREATE TABLE public.pages (
  page_id text PRIMARY KEY,
  content jsonb NOT NULL,
  content_format_version integer NOT NULL DEFAULT 1 CHECK (content_format_version >= 1),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pages_content_object_check
    CHECK (jsonb_typeof(content) = 'object')
);

COMMENT ON TABLE public.pages IS
  'Current editable document for each page_id in the Page Editor.';

CREATE INDEX pages_updated_at_idx
  ON public.pages (updated_at DESC);

CREATE OR REPLACE FUNCTION public.pages_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER pages_set_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.pages_set_updated_at();

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pages_select_authenticated"
  ON public.pages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "pages_insert_authenticated"
  ON public.pages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "pages_update_authenticated"
  ON public.pages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
