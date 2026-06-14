-- User-selectable Claude model. Run once in the Supabase SQL editor. Idempotent.
ALTER TABLE public.cv_profile
  ADD COLUMN IF NOT EXISTS model text;
