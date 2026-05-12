ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pages-history" ENABLE ROW LEVEL SECURITY;

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
