-- Helper: timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- 1) COMMUNITY ENTRIES (новe речи из заједнице)
-- =========================================================
CREATE TABLE public.community_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  author_name TEXT,
  headword TEXT NOT NULL,
  letter TEXT,
  type TEXT,
  type_full TEXT,
  definition TEXT NOT NULL,
  meanings JSONB NOT NULL DEFAULT '[]'::jsonb,
  synonyms TEXT[] NOT NULL DEFAULT '{}',
  antonyms TEXT[] NOT NULL DEFAULT '{}',
  examples TEXT[] NOT NULL DEFAULT '{}',
  etymology TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_community_entries_letter ON public.community_entries(letter);
CREATE INDEX idx_community_entries_device ON public.community_entries(device_id);
CREATE INDEX idx_community_entries_headword ON public.community_entries(headword);

ALTER TABLE public.community_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community entries"
  ON public.community_entries FOR SELECT USING (true);
CREATE POLICY "Anyone can submit a community entry"
  ON public.community_entries FOR INSERT WITH CHECK (device_id IS NOT NULL AND length(device_id) > 0);
CREATE POLICY "Owner device can update its community entry"
  ON public.community_entries FOR UPDATE
  USING (device_id = current_setting('request.headers', true)::json->>'x-device-id')
  WITH CHECK (device_id = current_setting('request.headers', true)::json->>'x-device-id');
CREATE POLICY "Owner device can delete its community entry"
  ON public.community_entries FOR DELETE
  USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

CREATE TRIGGER trg_community_entries_updated
  BEFORE UPDATE ON public.community_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2) ENTRY EDITS (предложене измене постојећих одредница)
-- =========================================================
CREATE TABLE public.entry_edits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  author_name TEXT,
  proposed JSONB NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_entry_edits_entry ON public.entry_edits(entry_id);
CREATE INDEX idx_entry_edits_device ON public.entry_edits(device_id);

ALTER TABLE public.entry_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read entry edits"
  ON public.entry_edits FOR SELECT USING (true);
CREATE POLICY "Anyone can propose an edit"
  ON public.entry_edits FOR INSERT WITH CHECK (device_id IS NOT NULL AND length(device_id) > 0);
CREATE POLICY "Owner device can update its edit"
  ON public.entry_edits FOR UPDATE
  USING (device_id = current_setting('request.headers', true)::json->>'x-device-id')
  WITH CHECK (device_id = current_setting('request.headers', true)::json->>'x-device-id');
CREATE POLICY "Owner device can delete its edit"
  ON public.entry_edits FOR DELETE
  USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

CREATE TRIGGER trg_entry_edits_updated
  BEFORE UPDATE ON public.entry_edits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 3) VOTES (лајкови — 1 по уређају по циљу)
-- target_type: 'community_entry' | 'entry_edit' | 'published_dictionary'
-- =========================================================
CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, target_type, target_id)
);
CREATE INDEX idx_votes_target ON public.votes(target_type, target_id);
CREATE INDEX idx_votes_device ON public.votes(device_id);

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read votes"
  ON public.votes FOR SELECT USING (true);
CREATE POLICY "Anyone can vote"
  ON public.votes FOR INSERT WITH CHECK (device_id IS NOT NULL AND length(device_id) > 0);
CREATE POLICY "Owner device can remove its vote"
  ON public.votes FOR DELETE
  USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

-- =========================================================
-- 4) COMMENTS (коментари испод одредница)
-- entry_id је слободан текст (може да буде id из корпуса или community_entry id)
-- =========================================================
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  author_name TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_entry ON public.comments(entry_id);
CREATE INDEX idx_comments_device ON public.comments(device_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
  ON public.comments FOR SELECT USING (true);
CREATE POLICY "Anyone can post a comment"
  ON public.comments FOR INSERT WITH CHECK (
    device_id IS NOT NULL AND length(device_id) > 0
    AND length(body) > 0 AND length(body) <= 4000
  );
CREATE POLICY "Owner device can update its comment"
  ON public.comments FOR UPDATE
  USING (device_id = current_setting('request.headers', true)::json->>'x-device-id')
  WITH CHECK (device_id = current_setting('request.headers', true)::json->>'x-device-id');
CREATE POLICY "Owner device can delete its comment"
  ON public.comments FOR DELETE
  USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

CREATE TRIGGER trg_comments_updated
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 5) PUBLISHED DICTIONARIES (објављени лични речници)
-- =========================================================
CREATE TABLE public.published_dictionaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  entries_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pubdict_device ON public.published_dictionaries(device_id);
CREATE INDEX idx_pubdict_created ON public.published_dictionaries(created_at DESC);

ALTER TABLE public.published_dictionaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published dictionaries"
  ON public.published_dictionaries FOR SELECT USING (true);
CREATE POLICY "Anyone can publish a dictionary"
  ON public.published_dictionaries FOR INSERT WITH CHECK (
    device_id IS NOT NULL AND length(device_id) > 0
    AND length(title) > 0 AND length(title) <= 200
    AND length(author_name) > 0 AND length(author_name) <= 100
  );
CREATE POLICY "Owner device can update its published dictionary"
  ON public.published_dictionaries FOR UPDATE
  USING (device_id = current_setting('request.headers', true)::json->>'x-device-id')
  WITH CHECK (device_id = current_setting('request.headers', true)::json->>'x-device-id');
CREATE POLICY "Owner device can delete its published dictionary"
  ON public.published_dictionaries FOR DELETE
  USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

CREATE TRIGGER trg_pubdict_updated
  BEFORE UPDATE ON public.published_dictionaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();