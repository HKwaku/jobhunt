-- CV tailoring feature. Run once in the Supabase SQL editor.
-- Additive + idempotent.

-- Reusable CV format template, defined on the profile and reused per job.
ALTER TABLE public.cv_profile
  ADD COLUMN IF NOT EXISTS cv_format text;

-- Per-job tailored CV + the match score it achieves against that job.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS tailored_cv    text,
  ADD COLUMN IF NOT EXISTS tailored_score integer,
  ADD COLUMN IF NOT EXISTS tailored_at    timestamptz;
