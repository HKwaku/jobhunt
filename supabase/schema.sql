-- JobHunt schema. Run this in the Supabase SQL editor (or `supabase db push`).
-- Single-user app: no per-row user ownership / multi-tenancy.

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Module 1: CV profile (single row expected, but table supports many)
-- ---------------------------------------------------------------------------
create table if not exists cv_profile (
  id                  uuid primary key default gen_random_uuid(),
  raw_text            text not null default '',
  extracted_skills    jsonb not null default '[]'::jsonb,
  extracted_industries jsonb not null default '[]'::jsonb,
  seniority           text,
  years_experience    numeric,
  notable_employers   jsonb not null default '[]'::jsonb,
  summary             text,
  search_preferences  jsonb not null default '{}'::jsonb,
  cv_format           text,                       -- reusable tailoring template
  model               text,                       -- selected Claude model (null → default)
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Module 2: jobs
-- ---------------------------------------------------------------------------
create table if not exists jobs (
  id           uuid primary key default gen_random_uuid(),
  external_id  text,                       -- Adzuna id, used to de-duplicate
  title        text not null,
  company      text,
  location     text,
  salary       text,
  description  text,
  url          text,
  source       text default 'adzuna',
  industry     text,                       -- Claude-tagged sector (FS taxonomy)
  match_score  integer,
  fit_summary  text,
  strengths    jsonb not null default '[]'::jsonb,
  gaps         jsonb not null default '[]'::jsonb,
  status       text not null default 'New',
  notes        text,
  tailored_cv     text,                           -- Claude-tailored CV for this job
  tailored_score  integer,                        -- score the tailored CV achieves
  tailored_at     timestamptz,
  interview_prep    text,                          -- Claude interview prep (JSON)
  interview_prep_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index if not exists jobs_external_id_key
  on jobs (external_id) where external_id is not null;
create index if not exists jobs_status_idx on jobs (status);
create index if not exists jobs_match_score_idx on jobs (match_score desc);
create index if not exists jobs_industry_idx on jobs (industry);

-- ---------------------------------------------------------------------------
-- Module 3: contacts
-- ---------------------------------------------------------------------------
create table if not exists contacts (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  title             text,
  company           text,
  linkedin_url      text,
  email             text,
  phone             text,
  relationship_type text not null default 'cold',
  status            text not null default 'To Contact',
  source            text,
  linked_job_id     uuid references jobs (id) on delete set null,
  generated_message text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists contacts_status_idx on contacts (status);
create index if not exists contacts_company_idx on contacts (company);
create index if not exists contacts_linked_job_idx on contacts (linked_job_id);

-- ---------------------------------------------------------------------------
-- keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cv_profile_updated on cv_profile;
create trigger trg_cv_profile_updated before update on cv_profile
  for each row execute function set_updated_at();

drop trigger if exists trg_jobs_updated on jobs;
create trigger trg_jobs_updated before update on jobs
  for each row execute function set_updated_at();

drop trigger if exists trg_contacts_updated on contacts;
create trigger trg_contacts_updated before update on contacts
  for each row execute function set_updated_at();
