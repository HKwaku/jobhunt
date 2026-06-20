// ATS-direct job source: pulls roles straight from a company's own job board
// (Greenhouse, Lever or Ashby) — the freshest, most complete listings for firms
// you specifically target.
//
// Configure via the ATS_BOARDS env var, a comma-separated list of
//   provider:token[:Display Name]
// e.g. ATS_BOARDS="greenhouse:stripe:Stripe,lever:netflix,ashby:ramp:Ramp"
// The token is the company's board slug (the part in its careers URL). Boards
// list ALL open roles, so we filter titles against the search terms.

import type { JobListing } from "./types";
import { htmlToText } from "./text";

type Provider = "greenhouse" | "lever" | "ashby";
const PROVIDERS: Provider[] = ["greenhouse", "lever", "ashby"];

type Board = { provider: Provider; token: string; name: string };

// Normalized role from any provider, before keyword filtering.
type RawRole = {
  id: string;
  title: string;
  location: string | null;
  url: string | null;
  description: string | null;
};

function parseBoards(): Board[] {
  const raw = process.env.ATS_BOARDS;
  if (!raw) return [];
  const boards: Board[] = [];
  for (const entry of raw.split(",")) {
    const parts = entry.trim().split(":");
    const provider = parts[0]?.trim().toLowerCase() as Provider;
    const token = parts[1]?.trim();
    if (!provider || !token) continue;
    if (!PROVIDERS.includes(provider)) {
      console.warn(`[ats] unknown provider "${provider}" in ATS_BOARDS — skipped`);
      continue;
    }
    const name = parts.slice(2).join(":").trim() || token;
    boards.push({ provider, token, name });
  }
  return boards;
}

export function isAtsConfigured(): boolean {
  return parseBoards().length > 0;
}

export type AtsSearchParams = {
  what: string;
  where?: string;
  country?: string; // 2-letter app country code (e.g. "gb")
  resultsPerPage?: number;
};

// Include a role if its title shares a meaningful word with the search term.
function titleMatches(title: string, what: string): boolean {
  const words = what.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  if (words.length === 0) return true;
  const t = title.toLowerCase();
  return words.some((w) => t.includes(w));
}

// ATS boards list roles globally; aggregators filter by location server-side but
// these can't, so we filter here. UK terms (and EMEA/Europe regional postings)
// are accepted when the search is UK-oriented or the app country is "gb".
const UK_TERMS = [
  "united kingdom",
  "uk",
  "u.k.",
  "england",
  "scotland",
  "wales",
  "britain",
  "british",
  "london",
  "manchester",
  "edinburgh",
  "glasgow",
  "leeds",
  "birmingham",
  "bristol",
  "cambridge",
  "oxford",
  "reading",
];

function isUkOriented(where: string | undefined, country: string | undefined): boolean {
  if (where && UK_TERMS.some((t) => where.toLowerCase().includes(t))) return true;
  if (!where?.trim() && (country ?? "").toLowerCase() === "gb") return true;
  return false;
}

function locationAllowed(
  roleLocation: string | null,
  where: string | undefined,
  country: string | undefined
): boolean {
  const hasWhere = Boolean(where && where.trim());
  const uk = isUkOriented(where, country);
  // No location signal we can act on — don't filter.
  if (!hasWhere && !uk) return true;
  if (!roleLocation) return false; // can't verify location → drop when filtering
  const loc = roleLocation.toLowerCase();
  if (hasWhere && loc.includes((where as string).trim().toLowerCase())) return true;
  if (uk) {
    return (
      UK_TERMS.some((t) => loc.includes(t)) ||
      loc.includes("emea") ||
      loc.includes("europe")
    );
  }
  return false;
}

async function fetchJson(url: string, label: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${label} (${res.status})`);
  return res.json();
}

async function fetchGreenhouse(token: string): Promise<RawRole[]> {
  const data = (await fetchJson(
    `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`,
    `Greenhouse ${token}`
  )) as { jobs?: Array<{ id: number; title?: string; location?: { name?: string }; absolute_url?: string; content?: string }> };
  return (data.jobs ?? []).map((j) => ({
    id: String(j.id),
    title: j.title ?? "Untitled role",
    location: j.location?.name ?? null,
    url: j.absolute_url ?? null,
    description: j.content ? htmlToText(j.content) : null,
  }));
}

async function fetchLever(token: string): Promise<RawRole[]> {
  const data = (await fetchJson(
    `https://api.lever.co/v0/postings/${token}?mode=json`,
    `Lever ${token}`
  )) as Array<{ id: string; text?: string; hostedUrl?: string; applyUrl?: string; categories?: { location?: string }; descriptionPlain?: string; description?: string }>;
  return (data ?? []).map((j) => ({
    id: String(j.id),
    title: j.text ?? "Untitled role",
    location: j.categories?.location ?? null,
    url: j.hostedUrl ?? j.applyUrl ?? null,
    description:
      j.descriptionPlain ?? (j.description ? htmlToText(j.description) : null),
  }));
}

async function fetchAshby(token: string): Promise<RawRole[]> {
  const data = (await fetchJson(
    `https://api.ashbyhq.com/posting-api/job-board/${token}?includeCompensation=true`,
    `Ashby ${token}`
  )) as { jobs?: Array<{ id: string; title?: string; location?: string; jobUrl?: string; descriptionPlain?: string; descriptionHtml?: string }> };
  return (data.jobs ?? []).map((j) => ({
    id: String(j.id),
    title: j.title ?? "Untitled role",
    location: j.location ?? null,
    url: j.jobUrl ?? null,
    description:
      j.descriptionPlain ??
      (j.descriptionHtml ? htmlToText(j.descriptionHtml) : null),
  }));
}

const FETCHERS: Record<Provider, (token: string) => Promise<RawRole[]>> = {
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  ashby: fetchAshby,
};

export async function searchAts(
  params: AtsSearchParams
): Promise<JobListing[]> {
  const boards = parseBoards();
  if (boards.length === 0) return [];

  // Fetch every board in parallel; a single bad token must not drop the others.
  const perBoard = await Promise.all(
    boards.map(async (board): Promise<JobListing[]> => {
      try {
        const roles = await FETCHERS[board.provider](board.token);
        return roles
          .filter(
            (r) =>
              titleMatches(r.title, params.what) &&
              locationAllowed(r.location, params.where, params.country)
          )
          .slice(0, params.resultsPerPage ?? 20)
          .map((r) => ({
            externalId: `ats-${board.provider}-${board.token}-${r.id}`,
            title: r.title,
            company: board.name,
            location: r.location,
            salary: null,
            description: r.description,
            url: r.url,
            source: board.provider,
          }));
      } catch (e) {
        console.error(`[ats] ${board.provider}:${board.token} failed:`, (e as Error).message);
        return [];
      }
    })
  );

  return perBoard.flat();
}
