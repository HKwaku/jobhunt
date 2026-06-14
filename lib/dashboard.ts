import { listJobs } from "./jobs";
import { listContacts } from "./contacts";
import { matchBadge, JOB_STATUSES, CONTACT_STATUSES } from "./types";
import type { Job, MatchBadge } from "./types";

export type DashboardData = {
  matchDistribution: Record<MatchBadge, number>;
  unscored: number;
  jobsByStatus: Record<string, number>;
  contactsByStatus: Record<string, number>;
  totalJobs: number;
  totalContacts: number;
  topJobs: Job[];
  activity: ActivityItem[];
};

export type ActivityItem = {
  kind: "job" | "contact";
  label: string;
  detail: string;
  at: string;
  href: string;
};

export async function getDashboard(): Promise<DashboardData> {
  const [jobs, contacts] = await Promise.all([
    listJobs({ sort: "date" }),
    listContacts(),
  ]);

  const matchDistribution: Record<MatchBadge, number> = {
    Strong: 0,
    Good: 0,
    Partial: 0,
    Weak: 0,
  };
  let unscored = 0;
  for (const j of jobs) {
    const b = matchBadge(j.match_score);
    if (b) matchDistribution[b]++;
    else unscored++;
  }

  const jobsByStatus: Record<string, number> = {};
  for (const s of JOB_STATUSES) jobsByStatus[s] = 0;
  for (const j of jobs) jobsByStatus[j.status] = (jobsByStatus[j.status] ?? 0) + 1;

  const contactsByStatus: Record<string, number> = {};
  for (const s of CONTACT_STATUSES) contactsByStatus[s] = 0;
  for (const c of contacts)
    contactsByStatus[c.status] = (contactsByStatus[c.status] ?? 0) + 1;

  // Top 5 highest-match jobs not yet actioned (still "New").
  const topJobs = jobs
    .filter((j) => j.status === "New" && j.match_score != null)
    .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
    .slice(0, 5);

  // Recent activity: newest jobs and contacts, merged.
  const activity: ActivityItem[] = [
    ...jobs.map((j) => ({
      kind: "job" as const,
      label: j.title,
      detail: j.company ? `at ${j.company}` : "new job",
      at: j.created_at,
      href: "/jobs",
    })),
    ...contacts.map((c) => ({
      kind: "contact" as const,
      label: c.name,
      detail: c.company ? `contact · ${c.company}` : "contact",
      at: c.updated_at,
      href: "/contacts",
    })),
  ]
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 8);

  return {
    matchDistribution,
    unscored,
    jobsByStatus,
    contactsByStatus,
    totalJobs: jobs.length,
    totalContacts: contacts.length,
    topJobs,
    activity,
  };
}
