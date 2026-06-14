import { searchAdzuna, isAdzunaConfigured, type AdzunaJob } from "./adzuna";
import { scoreJobMatch, isAnthropicConfigured } from "./anthropic";
import { getProfile } from "./profile";
import {
  getExistingExternalIds,
  insertJobs,
  mapLimit,
  listJobs,
  updateJobScore,
} from "./jobs";

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
  if (!isAdzunaConfigured()) {
    throw new Error(
      "Adzuna is not configured. Set ADZUNA_APP_ID and ADZUNA_APP_KEY."
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

  // 1) Search Adzuna and de-duplicate within this run.
  const seen = new Map<string, AdzunaJob>();
  for (const what of queries) {
    const results = await searchAdzuna({
      what,
      where: location || undefined,
      country,
      salaryMin: prefs?.salary_min ?? null,
      resultsPerPage: perPage,
    });
    for (const job of results) {
      if (!seen.has(job.externalId)) seen.set(job.externalId, job);
    }
  }
  const found = [...seen.values()];

  // 2) Skip already-stored jobs.
  const existing = await getExistingExternalIds(found.map((j) => j.externalId));
  const fresh = found.filter((j) => !existing.has(j.externalId));

  // 3) Score fresh jobs with Claude (degrade gracefully).
  const canScore = Boolean(profile) && isAnthropicConfigured();
  const scored = await mapLimit(fresh, 4, async (job) => {
    let match = null;
    if (canScore && profile) {
      try {
        match = await scoreJobMatch(
          profile,
          {
            title: job.title,
            company: job.company,
            description: job.description,
          },
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
      source: "adzuna",
      match_score: match ? Math.round(match.match_score) : null,
      fit_summary: match?.fit_summary ?? null,
      strengths: match?.strengths ?? [],
      gaps: match?.gaps ?? [],
      status: "New",
    };
  });

  const inserted = await insertJobs(scored);

  return {
    found: found.length,
    skipped: existing.size,
    added: inserted.length,
    scored: canScore,
    warning: !canScore
      ? profile
        ? "Jobs added without match scores — ANTHROPIC_API_KEY is not set."
        : "Jobs added without match scores — create your CV profile first to enable matching."
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
