# JobHunt

A single-user job search and contact-management app. It matches Adzuna job
listings against your CV using Claude, and helps you track outreach.

Built with **Next.js 14 (App Router)**, **Supabase**, **Tailwind** (dark theme),
**Claude (`claude-sonnet-4-6`)** and the **Adzuna API**.

## Modules

1. **CV Profile** — upload a PDF or paste your CV. Claude extracts skills,
   industries, seniority, years of experience, notable employers and a ~200-word
   summary. You also define search preferences (roles, industries, firms,
   seniority, locations, salary). This profile drives everything else.
2. **Jobs** — searches Adzuna using your preferences (or ad-hoc keywords). Each
   new job is scored 0–100 against your CV by Claude, with a fit summary,
   strengths and gaps. Sort by match, filter by score/status/location, tag each
   job (New / Interested / Applied / Interviewing / Rejected / Closed) and add
   notes. Match badges: Strong (80+), Good (60–79), Partial (40–59), Weak (<40).
3. **Contacts** — a lightweight CRM. Add people, link them to jobs, generate a
   tailored outreach message with Claude, track status (To Contact → Reached Out
   → Responded → Meeting Booked / Not Relevant), filter, and export to CSV.
4. **Dashboard** — match distribution, job & contact pipelines, top 5 un-actioned
   matches, a recent-activity feed and quick actions.

All Anthropic, Adzuna and Supabase calls run **server-side only** (API routes /
server components). Claude failures degrade gracefully — e.g. jobs are still
saved if scoring fails, and CV text is stored even if extraction fails.

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...      # server-only; bypasses RLS
ANTHROPIC_API_KEY=...
ADZUNA_APP_ID=...                  # https://developer.adzuna.com
ADZUNA_APP_KEY=...
ADZUNA_COUNTRY=gb                  # 2-letter Adzuna country code
# CRON_SECRET=...                  # optional; protects /api/cron/search
```

### 3. Database

In the Supabase SQL editor, run [`supabase/schema.sql`](supabase/schema.sql).
It creates `cv_profile`, `jobs` and `contacts` with indexes and
`updated_at` triggers.

### 4. Run

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
```

### First run

1. Go to **CV Profile**, add your CV, click **Save & Extract**, then set your
   **search preferences**.
2. Go to **Jobs** and click **Run search**.
3. Add **Contacts** (optionally from a job via "+ Add contact") and generate
   outreach.

## Scheduled (daily) search

`GET /api/cron/search` runs a search using your saved preferences.
[`vercel.json`](vercel.json) schedules it daily at 07:00 UTC on Vercel Cron. If
`CRON_SECRET` is set, send `Authorization: Bearer <CRON_SECRET>`.

## Project layout

```
app/
  page.tsx                 Dashboard (Module 4)
  profile/                 CV Profile (Module 1)
  jobs/                    Jobs (Module 2)
  contacts/                Contacts (Module 3)
  api/
    cv/                    profile read/update, extract, parse-pdf
    jobs/                  search, list, [id] update/delete
    contacts/              list/create, [id] update/delete, message, export
    cron/search            scheduled search
lib/                       supabase, anthropic, adzuna, data access, types
components/                Nav, shared UI, config banner
supabase/schema.sql        database schema
```

## Notes

- Single-user: no auth/multi-tenancy. The service-role key is used server-side;
  do not expose it to the client.
- Adzuna returns at most a page of results per query term; a run uses up to your
  first 3 target roles and de-duplicates by Adzuna job id.
