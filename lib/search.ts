import { searchAdzuna, isAdzunaConfigured } from "./adzuna";
import { searchReed, isReedConfigured } from "./reed";
import { searchJsearch, isJsearchConfigured } from "./jsearch";
import { searchAts, isAtsConfigured } from "./ats";
import { scoreJobMatch, isAnthropicConfigured } from "./anthropic";
import { getProfile } from "./profile";
import type { JobListing, CvProfile } from "./types";
import { REAL_ESTATE_IM_FIRMS } from "./target-firms";
import {
  getExistingExternalIds,
  insertJobs,
  mapLimit,
  listJobs,
  updateJobScore,
} from "./jobs";

// A query passed to every source for a single search term.
type SourceQuery = {
  what: string;
  where?: string;
  country: string;
  salaryMin?: number | null;
  resultsPerPage: number;
};

// Registry of job sources. Add a new source by writing an adapter that returns
// JobListing[] and appending it here — the orchestrator handles the rest.
// `kind`: "keyword" sources take a free-text query (so they can be searched by
// firm name); "board" sources list a fixed set of company boards.
type JobSource = {
  name: string;
  kind: "keyword" | "board";
  isConfigured: () => boolean;
  search: (q: SourceQuery) => Promise<JobListing[]>;
};

const SOURCES: JobSource[] = [
  {
    name: "Adzuna",
    kind: "keyword",
    isConfigured: isAdzunaConfigured,
    search: (q) =>
      searchAdzuna({
        what: q.what,
        where: q.where,
        country: q.country,
        salaryMin: q.salaryMin,
        resultsPerPage: q.resultsPerPage,
      }),
  },
  {
    name: "Reed",
    kind: "keyword",
    isConfigured: isReedConfigured,
    search: (q) =>
      searchReed({
        what: q.what,
        where: q.where,
        salaryMin: q.salaryMin,
        resultsPerPage: q.resultsPerPage,
      }),
  },
  {
    name: "JSearch",
    kind: "keyword",
    isConfigured: isJsearchConfigured,
    search: (q) =>
      searchJsearch({
        what: q.what,
        where: q.where,
        country: q.country,
        resultsPerPage: q.resultsPerPage,
      }),
  },
  {
    name: "ATS",
    kind: "board",
    isConfigured: isAtsConfigured,
    search: (q) =>
      searchAts({
        what: q.what,
        where: q.where,
        country: q.country,
        resultsPerPage: q.resultsPerPage,
      }),
  },
];

// De-duplicate against stored jobs, score the fresh ones with Claude (degrading
// gracefully), and insert. Shared by the keyword search and firm-watchlist flows.
async function persistListings(
  found: JobListing[],
  profile: CvProfile | null
): Promise<{ added: number; skipped: number; scored: boolean }> {
  const existing = await getExistingExternalIds(found.map((j) => j.externalId));
  const fresh = found.filter((j) => !existing.has(j.externalId));

  const canScore = Boolean(profile) && isAnthropicConfigured();
  const rows = await mapLimit(fresh, 4, async (job) => {
    let match = null;
    if (canScore && profile) {
      try {
        match = await scoreJobMatch(
          profile,
          { title: job.title, company: job.company, description: job.description },
          profile.model ?? undefined
        );
      } catch {
        match = null;
      }
    }
    return {
      external_id: job.externalId,
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary,
      description: job.description,
      url: job.url,
      source: job.source,
      industry: match?.industry ?? null,
      match_score: match ? Math.round(match.match_score) : null,
      fit_summary: match?.fit_summary ?? null,
      strengths: match?.strengths ?? [],
      gaps: match?.gaps ?? [],
      status: "New",
    };
  });

  const inserted = await insertJobs(rows);
  return { added: inserted.length, skipped: existing.size, scored: canScore };
}

export type RunSearchInput = {
  keywords?: string;
  location?: string;
  limit?: number;
};

export type RunSearchResult = {
  found: number;
  skipped: number;
  added: number;
  scored: boolean;
  warning?: string;
};

// Shared orchestration used by both the manual search route and the cron route.
export async function runJobSearch(
  input: RunSearchInput = {}
): Promise<RunSearchResult> {
  const activeSources = SOURCES.filter((s) => s.isConfigured());
  if (activeSources.length === 0) {
    throw new Error(
      "No job source is configured. Set Adzuna (ADZUNA_APP_ID + ADZUNA_APP_KEY) or Reed (REED_API_KEY)."
    );
  }

  const profile = await getProfile();
  const prefs = profile?.search_preferences;

  let queries: string[] = [];
  if (input.keywords?.trim()) queries = [input.keywords.trim()];
  else if (prefs?.target_roles?.length) queries = prefs.target_roles.slice(0, 3);

  if (queries.length === 0) {
    throw new Error(
      "No search terms. Enter keywords or set target roles in your CV profile."
    );
  }

  const location = input.location?.trim() || prefs?.locations?.[0] || "";
  const country = process.env.ADZUNA_COUNTRY || "gb";
  const perPage = Math.min(input.limit ?? 15, 30);

  // 1) Search every configured source and de-duplicate within this run.
  // One source failing (e.g. a transient API error) must not abort the run.
  const seen = new Map<string, JobListing>();
  for (const what of queries) {
    for (const source of activeSources) {
      try {
        const results = await source.search({
          what,
          where: location || undefined,
          country,
          // No salary floor: API salary filters also drop roles that omit
          // salary, losing good listings. Filter/sort by score in the UI instead.
          salaryMin: null,
          resultsPerPage: perPage,
        });
        for (const job of results) {
          if (!seen.has(job.externalId)) seen.set(job.externalId, job);
        }
      } catch (e) {
        console.error(`[search] ${source.name} failed:`, (e as Error).message);
      }
    }
  }
  const found = [...seen.values()];

  // 2) De-duplicate, score and store.
  const { added, skipped, scored } = await persistListings(found, profile);

  return {
    found: found.length,
    skipped,
    added,
    scored,
    warning: !scored
      ? profile
        ? "Jobs added without match scores — ANTHROPIC_API_KEY is not set."
        : "Jobs added without match scores — create your CV profile first to enable matching."
      : undefined,
  };
}

// ---- Firm watchlist search ----
// Title keywords that signal an in-house technology / transformation / data /
// operations seat (as opposed to e.g. an analyst, accountant or lawyer role).
const ROLE_ANCHORS = [
  "technolog",
  "transformation",
  "digital",
  "data",
  "analytics",
  "operating model",
  "operations",
  "change",
  "programme",
  "program",
  "innovation",
  "automation",
  "platform",
  "systems",
  "pmo",
  "cto",
  "cio",
  "coo",
  "architect",
  "product",
];

function titleHasAnchor(title: string): boolean {
  const t = title.toLowerCase();
  return ROLE_ANCHORS.some((a) => t.includes(a));
}

export type FirmSearchResult = RunSearchResult & { firmsSearched: number };

// Search a watchlist of real estate investment managers BY NAME across keyword
// sources, keeping only technology/transformation-style roles. This targets
// in-house seats within the investment firm (firms that mostly aren't on ATS
// boards, so name search is the only way to reach them).
export async function runFirmWatchlistSearch(
  input: { location?: string; limit?: number } = {}
): Promise<FirmSearchResult> {
  const keywordSources = SOURCES.filter(
    (s) => s.kind === "keyword" && s.isConfigured()
  );
  if (keywordSources.length === 0) {
    throw new Error(
      "No keyword source is configured. Set Adzuna, Reed or JSearch to search firms by name."
    );
  }

  const profile = await getProfile();
  const prefs = profile?.search_preferences;
  const location = input.location?.trim() || prefs?.locations?.[0] || "London";
  const country = process.env.ADZUNA_COUNTRY || "gb";
  const firms = input.limit
    ? REAL_ESTATE_IM_FIRMS.slice(0, input.limit)
    : REAL_ESTATE_IM_FIRMS;

  // Query each firm by name across keyword sources; keep only role-relevant
  // titles. A single firm/source failing must not abort the run.
  const seen = new Map<string, JobListing>();
  await mapLimit(firms, 4, async (firm) => {
    for (const source of keywordSources) {
      try {
        const results = await source.search({
          what: firm,
          where: location || undefined,
          country,
          // Deliberately ignore the salary floor here: in-house roles often omit
          // salary (which API salary filters then drop), and this search is
          // already narrowed by firm + role anchors. Let scoring/you judge.
          salaryMin: null,
          resultsPerPage: 10,
        });
        for (const job of results) {
          if (titleHasAnchor(job.title) && !seen.has(job.externalId)) {
            seen.set(job.externalId, job);
          }
        }
      } catch (e) {
        console.error(
          `[firm-search] ${source.name} "${firm}" failed:`,
          (e as Error).message
        );
      }
    }
  });

  const found = [...seen.values()];
  const { added, skipped, scored } = await persistListings(found, profile);

  return {
    found: found.length,
    skipped,
    added,
    scored,
    firmsSearched: firms.length,
    warning: !scored
      ? profile
        ? "Roles added without match scores — ANTHROPIC_API_KEY is not set."
        : "Roles added without match scores — create your CV profile first to enable matching."
      : undefined,
  };
}

export type RescoreResult = {
  total: number;
  rescored: number;
  failed: number;
};

// Re-run Claude scoring for existing jobs against the CURRENT CV profile.
// Useful after the CV/profile changes — search alone never re-scores jobs it
// has already stored. Pass `ids` to limit to specific jobs, else re-score all.
export async function rescoreJobs(ids?: string[]): Promise<RescoreResult> {
  if (!isAnthropicConfigured()) {
    throw new Error("ANTHROPIC_API_KEY is not set — cannot score matches.");
  }
  const profile = await getProfile();
  if (!profile) {
    throw new Error("Create your CV profile first to enable matching.");
  }

  let jobs = await listJobs({ sort: "date" });
  if (ids && ids.length) {
    const set = new Set(ids);
    jobs = jobs.filter((j) => set.has(j.id));
  }

  let failed = 0;
  const results = await mapLimit(jobs, 4, async (job) => {
    try {
      const match = await scoreJobMatch(profile, {
        title: job.title,
        company: job.company,
        description: job.description,
      });
      await updateJobScore(job.id, match);
      return true;
    } catch {
      failed++;
      return false;
    }
  });

  return {
    total: jobs.length,
    rescored: results.filter(Boolean).length,
    failed,
  };
}
