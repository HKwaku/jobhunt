import { NextResponse } from "next/server";
import { TARGET_FIRMS, ATS_CANDIDATES } from "@/lib/target-firms";
import { mapLimit } from "@/lib/jobs";

export const dynamic = "force-dynamic";
// Hobby plan caps serverless maxDuration at 300s. The full probe may exceed this
// in production; run it locally (or pass ?firms=...) if it times out.
export const maxDuration = 300;

// One-off helper: probe Greenhouse / Lever / Ashby for each target firm and
// return a ready-to-paste ATS_BOARDS string of the boards that actually exist.
// Hit it once in the browser: GET /api/ats/resolve
//
// Most traditional FS firms (banks, PE, hedge funds) do NOT use these ATSs, so
// expect a modest match rate — mainly fintechs and modern asset managers.

type Provider = "greenhouse" | "lever" | "ashby";

function slugCandidates(name: string): string[] {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/\.(com|io|co|ai)\b/g, "") // drop tld-style suffixes (checkout.com)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const words = base.split(/\s+/).filter(Boolean);
  const compact = words.join("");
  const hyphen = words.join("-");
  const firstWord = words[0] ?? "";
  // compact + hyphen + first word (e.g. "checkout", "xtx") — covers the common
  // ATS slug shapes. Early-stop on first hit keeps the request count bounded.
  return [...new Set([compact, hyphen, firstWord])].filter((s) => s.length > 1);
}

async function fetchJson(url: string): Promise<unknown | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Returns the open-role count if a board exists at this slug, else null.
async function probe(provider: Provider, slug: string): Promise<number | null> {
  if (provider === "greenhouse") {
    const d = (await fetchJson(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`
    )) as { jobs?: unknown[] } | null;
    return d?.jobs ? d.jobs.length : null;
  }
  if (provider === "lever") {
    const d = await fetchJson(`https://api.lever.co/v0/postings/${slug}?mode=json`);
    return Array.isArray(d) ? d.length : null;
  }
  // ashby
  const d = (await fetchJson(
    `https://api.ashbyhq.com/posting-api/job-board/${slug}`
  )) as { jobs?: unknown[] } | null;
  return d?.jobs ? d.jobs.length : null;
}

const PROVIDERS: Provider[] = ["greenhouse", "lever", "ashby"];

export async function GET(req: Request) {
  type Match = { firm: string; provider: Provider; slug: string; openRoles: number };
  const matches: Match[] = [];
  const unmatched: string[] = [];

  // Optional ?firms=Name1,Name2 overrides the default pool (probe a custom list).
  const custom = new URL(req.url).searchParams.get("firms");
  const pool = custom
    ? custom.split(",").map((s) => s.trim()).filter(Boolean)
    : [...TARGET_FIRMS.map((f) => f.name), ...ATS_CANDIDATES];

  // De-dupe case-insensitively by name.
  const seen = new Set<string>();
  const firms: string[] = [];
  for (const name of pool) {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      firms.push(name);
    }
  }

  await mapLimit(firms, 15, async (name) => {
    const candidates = slugCandidates(name);
    for (const provider of PROVIDERS) {
      for (const slug of candidates) {
        const count = await probe(provider, slug);
        if (count !== null && count > 0) {
          matches.push({ firm: name, provider, slug, openRoles: count });
          return; // stop at first hit for this firm
        }
      }
    }
    unmatched.push(name);
  });

  // Build the env value: provider:slug:Display Name, comma-separated.
  const atsBoards = matches
    .map((m) => `${m.provider}:${m.slug}:${m.firm}`)
    .join(",");

  return NextResponse.json({
    matched: matches.sort((a, b) => b.openRoles - a.openRoles),
    matchedCount: matches.length,
    unmatchedCount: unmatched.length,
    unmatched,
    atsBoards,
    note:
      "Paste `atsBoards` into ATS_BOARDS in .env.local and restart. Most " +
      "traditional FS firms aren't on these ATSs, so a low match rate is expected.",
  });
}
