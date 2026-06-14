-- Interview prep feature. Run once in the Supabase SQL editor. Idempotent.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS interview_prep    text,        -- JSON, generated on demand
  ADD COLUMN IF NOT EXISTS interview_prep_at timestamptz;
