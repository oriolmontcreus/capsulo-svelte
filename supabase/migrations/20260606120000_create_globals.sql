CREATE TABLE public.globals (
  id text PRIMARY KEY DEFAULT 'globals',
  content jsonb NOT NULL,
  content_format_version integer NOT NULL DEFAULT 1 CHECK (content_format_version >= 1),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT globals_content_object_check
    CHECK (jsonb_typeof(content) = 'object'),
  CONSTRAINT globals_single_row_check
    CHECK (id = 'globals')
);

COMMENT ON TABLE public.globals IS
  'Site-wide global variables document for the CMS.';

CREATE INDEX globals_updated_at_idx
  ON public.globals (updated_at DESC);

CREATE OR REPLACE FUNCTION public.globals_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER globals_set_updated_at
  BEFORE UPDATE ON public.globals
  FOR EACH ROW
  EXECUTE FUNCTION public.globals_set_updated_at();

ALTER TABLE public.globals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "globals_select_authenticated"
  ON public.globals
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "globals_insert_authenticated"
  ON public.globals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "globals_update_authenticated"
  ON public.globals
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
