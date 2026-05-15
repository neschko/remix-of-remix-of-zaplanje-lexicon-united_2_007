
-- Entry corrections (OCR review)
CREATE TABLE public.entry_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id TEXT NOT NULL,
  original JSONB NOT NULL,
  corrected JSONB NOT NULL,
  confidence NUMERIC(3,2),
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.entry_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read corrections"
  ON public.entry_corrections FOR SELECT USING (true);

CREATE POLICY "Admins can insert corrections"
  ON public.entry_corrections FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update corrections"
  ON public.entry_corrections FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete corrections"
  ON public.entry_corrections FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_entry_corrections_updated_at
  BEFORE UPDATE ON public.entry_corrections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Analysis history (per-user)
CREATE TABLE public.analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  input_text TEXT,
  audio_path TEXT,
  model TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own analyses"
  ON public.analysis_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON public.analysis_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON public.analysis_history FOR DELETE
  USING (auth.uid() = user_id);

-- Storage bucket for audio
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'analysis-audio',
  'analysis-audio',
  false,
  5242880,
  ARRAY['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/mp4','audio/x-m4a','audio/m4a','audio/ogg','audio/webm']
);

CREATE POLICY "Users can read own audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'analysis-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own audio"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'analysis-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own audio"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'analysis-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
