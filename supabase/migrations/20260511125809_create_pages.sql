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
