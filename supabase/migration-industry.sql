-- Add an industry/sector classification to jobs (set by Claude during scoring).
-- Idempotent: safe to run more than once.

alter table jobs add column if not exists industry text;

create index if not exists jobs_industry_idx on jobs (industry);
