// JSearch (RapidAPI) job search client.
// https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
// Aggregates Google for Jobs (LinkedIn, Indeed, Glassdoor, ZipRecruiter, ...).
// Auth is a RapidAPI key sent in the X-RapidAPI-Key header.

import type { JobListing } from "./types";

const HOST = "jsearch.p.rapidapi.com";

export function isJsearchConfigured(): boolean {
  return Boolean(process.env.JSEARCH_API_KEY);
}

export type JsearchSearchParams = {
  what: string;
  where?: string;
  country?: string; // 2-letter code, default "gb"
  resultsPerPage?: number;
};

type JsearchApiJob = {
  job_id: string;
  job_title?: string;
  employer_name?: string;
  job_description?: string;
  job_apply_link?: string;
  job_google_link?: string;
  job_city?: string | null;
  job_state?: string | null;
  job_country?: string | null;
  job_min_salary?: number | null;
  job_max_salary?: number | null;
  job_salary_period?: string | null;
};

function fmtSalary(
  min?: number | null,
  max?: number | null,
  period?: string | null
): string | null {
  if (!min && !max) return null;
  const f = (n: number) => n.toLocaleString("en-GB", { maximumFractionDigits: 0 });
  const range = min && max ? `${f(min)} - ${f(max)}` : f((min ?? max) as number);
  const suffix = period ? ` / ${period.toLowerCase()}` : "";
  return `${range}${suffix}`;
}

export async function searchJsearch(
  params: JsearchSearchParams
): Promise<JobListing[]> {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey) {
    throw new Error("JSearch is not configured. Set JSEARCH_API_KEY in .env.local.");
  }

  // JSearch takes the location inside the free-text query (e.g. "PM in London").
  const queryText = params.where
    ? `${params.what} in ${params.where}`
    : params.what;

  const query = new URLSearchParams({
    query: queryText,
    page: "1",
    num_pages: "1",
    date_posted: "all",
    country: (params.country || "gb").toLowerCase(),
  });

  const url = `https://${HOST}/search?${query.toString()}`;
  const res = await fetch(url, {
    headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": HOST },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`JSearch request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { data?: JsearchApiJob[] };

  const limit = params.resultsPerPage ?? 20;
  return (data.data ?? []).slice(0, limit).map((r) => ({
    externalId: `jsearch-${r.job_id}`,
    title: r.job_title ?? "Untitled role",
    company: r.employer_name ?? null,
    location:
      [r.job_city, r.job_state, r.job_country].filter(Boolean).join(", ") || null,
    salary: fmtSalary(r.job_min_salary, r.job_max_salary, r.job_salary_period),
    description: r.job_description ?? null,
    url: r.job_apply_link ?? r.job_google_link ?? null,
    source: "jsearch",
  }));
}
