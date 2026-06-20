// Reed.co.uk Jobseeker API client. https://www.reed.co.uk/developers/jobseeker
// UK-focused job board. Auth is HTTP Basic with the API key as the username
// and an empty password.

import type { JobListing } from "./types";
import { htmlToText } from "./text";

export function isReedConfigured(): boolean {
  return Boolean(process.env.REED_API_KEY);
}

export type ReedSearchParams = {
  what: string;
  where?: string;
  salaryMin?: number | null;
  resultsPerPage?: number;
};

type ReedApiJob = {
  jobId: number;
  employerName?: string;
  jobTitle?: string;
  locationName?: string;
  minimumSalary?: number | null;
  maximumSalary?: number | null;
  jobUrl?: string;
  jobDescription?: string;
};

function fmtSalary(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null;
  const f = (n: number) =>
    n.toLocaleString("en-GB", { maximumFractionDigits: 0 });
  if (min && max) return `${f(min)} - ${f(max)}`;
  return f((min ?? max) as number);
}

export async function searchReed(
  params: ReedSearchParams
): Promise<JobListing[]> {
  const apiKey = process.env.REED_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Reed is not configured. Set REED_API_KEY in .env.local."
    );
  }

  const query = new URLSearchParams({
    keywords: params.what,
    resultsToTake: String(params.resultsPerPage ?? 20),
  });
  if (params.where) {
    query.set("locationName", params.where);
    query.set("distanceFromLocation", "15"); // miles
  }
  if (params.salaryMin) query.set("minimumSalary", String(params.salaryMin));

  const url = `https://www.reed.co.uk/api/1.0/search?${query.toString()}`;
  // API key is the basic-auth username; password is empty.
  const auth = Buffer.from(`${apiKey}:`).toString("base64");

  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Reed request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { results?: ReedApiJob[] };

  return (data.results ?? []).map((r) => ({
    // Prefix to avoid colliding with another source's numeric ids when
    // de-duplicating (existing Adzuna ids are stored unprefixed).
    externalId: `reed-${r.jobId}`,
    title: r.jobTitle ?? "Untitled role",
    company: r.employerName ?? null,
    location: r.locationName ?? null,
    salary: fmtSalary(r.minimumSalary, r.maximumSalary),
    description: r.jobDescription ? htmlToText(r.jobDescription) : null,
    url: r.jobUrl ?? null,
    source: "reed",
  }));
}
