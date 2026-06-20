// Adzuna job search client. https://developer.adzuna.com/

import type { JobListing } from "./types";

export function isAdzunaConfigured(): boolean {
  return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
}

function fmtSalary(min?: number, max?: number): string | null {
  if (!min && !max) return null;
  const f = (n: number) =>
    n.toLocaleString("en-GB", { maximumFractionDigits: 0 });
  if (min && max) return `${f(min)} - ${f(max)}`;
  return f((min ?? max) as number);
}

export type AdzunaSearchParams = {
  what: string;
  where?: string;
  country?: string; // 2-letter Adzuna country code, default "gb"
  salaryMin?: number | null;
  resultsPerPage?: number;
  page?: number;
};

export async function searchAdzuna(
  params: AdzunaSearchParams
): Promise<JobListing[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    throw new Error(
      "Adzuna is not configured. Set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env.local."
    );
  }

  const country = (params.country || "gb").toLowerCase();
  const page = params.page ?? 1;
  const query = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(params.resultsPerPage ?? 20),
    what: params.what,
  });
  if (params.where) query.set("where", params.where);
  if (params.salaryMin) query.set("salary_min", String(params.salaryMin));

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${query.toString()}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Adzuna request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { results?: AdzunaApiJob[] };

  return (data.results ?? []).map((r) => ({
    externalId: String(r.id),
    title: r.title ?? "Untitled role",
    company: r.company?.display_name ?? null,
    location: r.location?.display_name ?? null,
    salary: fmtSalary(r.salary_min, r.salary_max),
    description: r.description ?? null,
    url: r.redirect_url ?? null,
    source: "adzuna",
  }));
}

type AdzunaApiJob = {
  id: string | number;
  title?: string;
  description?: string;
  redirect_url?: string;
  salary_min?: number;
  salary_max?: number;
  company?: { display_name?: string };
  location?: { display_name?: string };
};
