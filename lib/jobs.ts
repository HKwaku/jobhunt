import { getSupabase } from "./supabase";
import type { Job, JobStatus, JobMatch } from "./types";
import { FINANCIAL_SERVICES_INDUSTRIES } from "./types";

export function normalizeJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "Untitled role",
    company: (row.company as string) ?? null,
    location: (row.location as string) ?? null,
    salary: (row.salary as string) ?? null,
    description: (row.description as string) ?? null,
    url: (row.url as string) ?? null,
    source: (row.source as string) ?? null,
    industry: (row.industry as string) ?? null,
    match_score: (row.match_score as number) ?? null,
    fit_summary: (row.fit_summary as string) ?? null,
    strengths: (row.strengths as string[]) ?? [],
    gaps: (row.gaps as string[]) ?? [],
    status: ((row.status as JobStatus) ?? "New") as JobStatus,
    notes: (row.notes as string) ?? null,
    tailored_cv: (row.tailored_cv as string) ?? null,
    tailored_score: (row.tailored_score as number) ?? null,
    tailored_at: (row.tailored_at as string) ?? null,
    interview_prep: (row.interview_prep as string) ?? null,
    interview_prep_at: (row.interview_prep_at as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// Special industry filter value meaning "any financial-services sector".
export const FS_INDUSTRY_FILTER = "Financial Services";

export type JobFilters = {
  status?: string;
  minScore?: number;
  q?: string;
  location?: string;
  industry?: string;
  sort?: "score" | "date";
};

export async function listJobs(filters: JobFilters = {}): Promise<Job[]> {
  const supabase = getSupabase();
  let query = supabase.from("jobs").select("*");

  if (filters.status && filters.status !== "All") {
    query = query.eq("status", filters.status);
  }
  if (typeof filters.minScore === "number") {
    query = query.gte("match_score", filters.minScore);
  }
  if (filters.location) {
    query = query.ilike("location", `%${filters.location}%`);
  }
  if (filters.industry && filters.industry !== "All") {
    if (filters.industry === FS_INDUSTRY_FILTER) {
      query = query.in("industry", FINANCIAL_SERVICES_INDUSTRIES);
    } else {
      query = query.eq("industry", filters.industry);
    }
  }
  if (filters.q) {
    query = query.or(
      `title.ilike.%${filters.q}%,company.ilike.%${filters.q}%`
    );
  }

  if (filters.sort === "date") {
    query = query.order("created_at", { ascending: false });
  } else {
    // Default: highest match first, nulls last.
    query = query
      .order("match_score", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeJob);
}

export async function getExistingExternalIds(
  ids: string[]
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("jobs")
    .select("external_id")
    .in("external_id", ids);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.external_id as string));
}

export async function insertJobs(
  rows: Record<string, unknown>[]
): Promise<Job[]> {
  if (rows.length === 0) return [];
  const supabase = getSupabase();
  // Callers de-duplicate against existing external_ids first
  // (see getExistingExternalIds), so a plain insert is sufficient and avoids
  // depending on an ON CONFLICT target.
  const { data, error } = await supabase.from("jobs").insert(rows).select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeJob);
}

export async function getJob(id: string): Promise<Job | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalizeJob(data) : null;
}

export async function updateJobTailored(
  id: string,
  patch: { tailored_cv: string; tailored_score: number | null }
): Promise<Job> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("jobs")
    .update({
      tailored_cv: patch.tailored_cv,
      tailored_score: patch.tailored_score,
      tailored_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeJob(data);
}

export async function updateJobInterviewPrep(
  id: string,
  prepJson: string
): Promise<Job> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("jobs")
    .update({
      interview_prep: prepJson,
      interview_prep_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeJob(data);
}

export async function updateJob(
  id: string,
  patch: Partial<Pick<Job, "status" | "notes">>
): Promise<Job> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("jobs")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeJob(data);
}

// Overwrite the Claude-derived match fields for an existing job.
export async function updateJobScore(
  id: string,
  match: JobMatch
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("jobs")
    .update({
      match_score: Math.round(match.match_score),
      fit_summary: match.fit_summary,
      strengths: match.strengths ?? [],
      gaps: match.gaps ?? [],
      industry: match.industry ?? null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteJob(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// Run async tasks with a small concurrency limit.
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}
