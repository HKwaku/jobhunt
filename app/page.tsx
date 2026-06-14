import Link from "next/link";
import { PageHeader, Card, MatchBadgePill, EmptyState } from "@/components/ui";
import ConfigBanner from "@/components/ConfigBanner";
import { getDashboard, type DashboardData } from "@/lib/dashboard";
import { isSupabaseConfigured } from "@/lib/supabase";
import { btnPrimary, btnSecondary } from "@/lib/styles";
import type { MatchBadge } from "@/lib/types";

export const dynamic = "force-dynamic";

const MATCH_COLORS: Record<MatchBadge, string> = {
  Strong: "text-emerald-400",
  Good: "text-sky-400",
  Partial: "text-amber-400",
  Weak: "text-zinc-400",
};

export default async function DashboardPage() {
  let data: DashboardData | null = null;
  let error: string | null = null;

  if (isSupabaseConfigured()) {
    try {
      data = await getDashboard();
    } catch (e) {
      error = (e as Error).message;
    }
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Your job search at a glance."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/jobs" className={btnPrimary}>
              Run search
            </Link>
            <Link href="/contacts" className={btnSecondary}>
              Add contact
            </Link>
            <Link href="/profile" className={btnSecondary}>
              Update CV
            </Link>
          </div>
        }
      />
      <ConfigBanner />
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </div>
      )}

      {!data ? (
        <EmptyState
          title="Connect Supabase to see your dashboard"
          body="Add your Supabase credentials to .env.local, then run the schema in supabase/schema.sql."
        />
      ) : (
        <div className="space-y-6">
          {/* Match distribution */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-zinc-300">
              CV match distribution
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["Strong", "Good", "Partial", "Weak"] as MatchBadge[]).map((b) => (
                <Card key={b}>
                  <p className={`text-3xl font-semibold ${MATCH_COLORS[b]}`}>
                    {data!.matchDistribution[b]}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">{b}</p>
                </Card>
              ))}
            </div>
            {data.unscored > 0 && (
              <p className="mt-2 text-xs text-zinc-500">
                {data.unscored} job{data.unscored === 1 ? "" : "s"} not yet scored.
              </p>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pipelines */}
            <Card>
              <h2 className="text-sm font-semibold text-zinc-300">
                Jobs pipeline
              </h2>
              <StatusBars
                data={data.jobsByStatus}
                total={data.totalJobs}
                accent="bg-brand-500"
              />
            </Card>
            <Card>
              <h2 className="text-sm font-semibold text-zinc-300">
                Contact pipeline
              </h2>
              <StatusBars
                data={data.contactsByStatus}
                total={data.totalContacts}
                accent="bg-sky-500"
              />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top jobs */}
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-300">
                  Top matches to action
                </h2>
                <Link
                  href="/jobs"
                  className="text-xs text-brand-400 hover:underline"
                >
                  View all
                </Link>
              </div>
              {data.topJobs.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No scored, un-actioned jobs yet. Run a search to populate this.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.topJobs.map((j) => (
                    <li
                      key={j.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-zinc-200">{j.title}</p>
                        <p className="truncate text-xs text-zinc-500">
                          {[j.company, j.location].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <MatchBadgePill score={j.match_score} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Activity */}
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-zinc-300">
                Recent activity
              </h2>
              {data.activity.length === 0 ? (
                <p className="text-sm text-zinc-500">Nothing yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {data.activity.map((a, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          a.kind === "job" ? "bg-brand-500" : "bg-sky-500"
                        }`}
                      />
                      <div className="min-w-0">
                        <Link
                          href={a.href}
                          className="text-zinc-200 hover:underline"
                        >
                          {a.label}
                        </Link>
                        <span className="text-zinc-500"> — {a.detail}</span>
                        <p className="text-xs text-zinc-600">
                          {new Date(a.at).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function StatusBars({
  data,
  total,
  accent,
}: {
  data: Record<string, number>;
  total: number;
  accent: string;
}) {
  const entries = Object.entries(data);
  return (
    <div className="mt-3 space-y-2">
      {entries.map(([status, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={status}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">{status}</span>
              <span className="text-zinc-500">{count}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div className={`h-full ${accent}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
      {total === 0 && <p className="text-sm text-zinc-500">Nothing here yet.</p>}
    </div>
  );
}
