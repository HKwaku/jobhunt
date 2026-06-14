"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Job, TailoredCv, InterviewPrep as InterviewPrepData } from "@/lib/types";
import { JOB_STATUSES, cvToPlainText } from "@/lib/types";
import { Card, MatchBadgePill, Chip, EmptyState } from "@/components/ui";
import { inputCls, btnPrimary, btnSecondary, btnGhost } from "@/lib/styles";

type Msg = { kind: "ok" | "warn" | "err"; text: string } | null;

const JOB_STATUS_TONE: Record<string, string> = {
  New: "bg-zinc-700 text-zinc-100",
  Interested: "bg-sky-500/20 text-sky-300",
  Uninterested: "bg-zinc-800 text-zinc-400",
  Applied: "bg-indigo-500/20 text-indigo-300",
  Interviewing: "bg-emerald-500/20 text-emerald-300",
  Rejected: "bg-red-500/20 text-red-300",
  Closed: "bg-zinc-800 text-zinc-500",
};

export default function JobsBoard({
  initial,
  cvFormat,
  hasProfile,
}: {
  initial: Job[];
  cvFormat: string;
  hasProfile: boolean;
}) {
  const [jobs, setJobs] = useState<Job[]>(initial);
  const [searching, setSearching] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  // search inputs
  const [keywords, setKeywords] = useState("");
  const [searchLoc, setSearchLoc] = useState("");

  // filters
  const [fStatus, setFStatus] = useState("All");
  const [fMinScore, setFMinScore] = useState("0");
  const [fSort, setFSort] = useState<"score" | "date">("score");
  const [fQuery, setFQuery] = useState("");

  // list | table view (persisted)
  const [view, setView] = useState<"list" | "table">("list");
  useEffect(() => {
    const saved = localStorage.getItem("jobhunt:jobsView");
    if (saved === "table" || saved === "list") setView(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("jobhunt:jobsView", view);
  }, [view]);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (fStatus !== "All") qs.set("status", fStatus);
      if (fMinScore !== "0") qs.set("minScore", fMinScore);
      if (fSort) qs.set("sort", fSort);
      if (fQuery.trim()) qs.set("q", fQuery.trim());
      const res = await fetch(`/api/jobs?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load jobs");
      setJobs(data.jobs);
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [fStatus, fMinScore, fSort, fQuery]);

  // Refetch when filters change (debounce the text query).
  useEffect(() => {
    const t = setTimeout(refetch, 250);
    return () => clearTimeout(t);
  }, [refetch]);

  async function runSearch() {
    setMsg(null);
    setSearching(true);
    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, location: searchLoc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setMsg({
        kind: data.warning ? "warn" : "ok",
        text:
          data.warning ||
          `Found ${data.found} jobs · added ${data.added} new · ${data.skipped} already saved.`,
      });
      await refetch();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setSearching(false);
    }
  }

  async function rescoreAll() {
    setMsg(null);
    setRescoring(true);
    try {
      const res = await fetch("/api/jobs/rescore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Re-score failed");
      setMsg({
        kind: data.failed ? "warn" : "ok",
        text: `Re-scored ${data.rescored}/${data.total} jobs against your current CV${
          data.failed ? ` · ${data.failed} failed` : ""
        }.`,
      });
      await refetch();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setRescoring(false);
    }
  }

  function patchLocal(id: string, patch: Partial<Job>) {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Keywords (blank uses your target roles)
            </label>
            <input
              className={inputCls}
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. product manager fintech"
            />
          </div>
          <div className="sm:w-56">
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Location
            </label>
            <input
              className={inputCls}
              value={searchLoc}
              onChange={(e) => setSearchLoc(e.target.value)}
              placeholder="London"
            />
          </div>
          <button onClick={runSearch} disabled={searching} className={btnPrimary}>
            {searching ? "Searching…" : "Run search"}
          </button>
          <button
            onClick={rescoreAll}
            disabled={rescoring || jobs.length === 0}
            className={btnSecondary}
            title="Re-score all saved jobs against your current CV profile"
          >
            {rescoring ? "Re-scoring…" : "Re-score all"}
          </button>
        </div>
        {msg && (
          <p
            className={`mt-3 text-sm ${
              msg.kind === "ok"
                ? "text-emerald-300"
                : msg.kind === "warn"
                ? "text-amber-300"
                : "text-red-300"
            }`}
          >
            {msg.text}
          </p>
        )}
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          className={inputCls + " max-w-xs"}
          value={fQuery}
          onChange={(e) => setFQuery(e.target.value)}
          placeholder="Filter by title or company…"
        />
        <select
          className={inputCls + " w-auto"}
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value)}
        >
          <option>All</option>
          {JOB_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          className={inputCls + " w-auto"}
          value={fMinScore}
          onChange={(e) => setFMinScore(e.target.value)}
        >
          <option value="0">Any score</option>
          <option value="80">Strong (80+)</option>
          <option value="60">Good (60+)</option>
          <option value="40">Partial (40+)</option>
        </select>
        <select
          className={inputCls + " w-auto"}
          value={fSort}
          onChange={(e) => setFSort(e.target.value as "score" | "date")}
        >
          <option value="score">Sort: match score</option>
          <option value="date">Sort: newest</option>
        </select>
        <span className="text-xs text-zinc-500">
          {loading ? "Loading…" : `${jobs.length} job${jobs.length === 1 ? "" : "s"}`}
        </span>

        <div className="ml-auto inline-flex rounded-lg border border-zinc-700 p-0.5">
          {(["list", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                view === v
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* List / Table */}
      {jobs.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          body="Run a search above. Results are scored against your CV profile and sorted by match."
        />
      ) : view === "table" ? (
        <JobsTable jobs={jobs} onPatch={patchLocal} />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              onPatch={patchLocal}
              onRefetch={refetch}
              cvFormat={cvFormat}
              hasProfile={hasProfile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Compact, scannable table view. Status is editable inline; richer actions
// (tailor, interview prep, notes) live in the list view.
function JobsTable({
  jobs,
  onPatch,
}: {
  jobs: Job[];
  onPatch: (id: string, patch: Partial<Job>) => void;
}) {
  async function setStatus(id: string, status: string) {
    onPatch(id, { status: status as Job["status"] });
    await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-[11px] uppercase tracking-wide text-zinc-500">
            <th className="px-3 py-2.5 font-medium">Match</th>
            <th className="px-3 py-2.5 font-medium">Title</th>
            <th className="px-3 py-2.5 font-medium">Company</th>
            <th className="px-3 py-2.5 font-medium">Location</th>
            <th className="px-3 py-2.5 font-medium">Salary</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr
              key={j.id}
              className="border-b border-zinc-900 last:border-0 hover:bg-zinc-900/40"
            >
              <td className="whitespace-nowrap px-3 py-2.5">
                <MatchBadgePill score={j.match_score} />
              </td>
              <td className="px-3 py-2.5">
                {j.url ? (
                  <a
                    href={j.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-zinc-100 hover:text-brand-400 hover:underline"
                  >
                    {j.title}
                  </a>
                ) : (
                  <span className="font-medium text-zinc-100">{j.title}</span>
                )}
                <span className="ml-1.5 text-xs text-zinc-600">
                  {j.tailored_cv ? "· CV ✓" : ""}
                  {j.interview_prep ? " · Prep ✓" : ""}
                </span>
              </td>
              <td className="px-3 py-2.5 text-zinc-400">{j.company ?? "-"}</td>
              <td className="px-3 py-2.5 text-zinc-400">{j.location ?? "-"}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-400">
                {j.salary ?? "-"}
              </td>
              <td className="px-3 py-2.5">
                <select
                  value={j.status}
                  onChange={(e) => setStatus(j.id, e.target.value)}
                  className={`cursor-pointer rounded-md border-0 px-2 py-1 text-xs font-semibold outline-none ${
                    JOB_STATUS_TONE[j.status] ?? "bg-zinc-700 text-zinc-100"
                  }`}
                >
                  {JOB_STATUSES.map((st) => (
                    <option key={st} className="bg-zinc-900 text-zinc-100">
                      {st}
                    </option>
                  ))}
                </select>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right">
                <Link
                  href={`/contacts?job=${j.id}`}
                  className="text-xs text-zinc-500 hover:text-brand-400"
                >
                  + Contact
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseStoredCv(raw: string | null): TailoredCv | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TailoredCv;
  } catch {
    return null;
  }
}

function TailorCv({
  job,
  cvFormat,
  hasProfile,
}: {
  job: Job;
  cvFormat: string;
  hasProfile: boolean;
}) {
  const [notes, setNotes] = useState(cvFormat);
  const [showNotes, setShowNotes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [cv, setCv] = useState<TailoredCv | null>(parseStoredCv(job.tailored_cv));
  const [before, setBefore] = useState<number | null>(
    job.tailored_cv ? job.match_score : null
  );
  const [after, setAfter] = useState<number | null>(
    job.tailored_cv ? job.tailored_score : null
  );
  const [afterSummary, setAfterSummary] = useState<string | null>(null);

  async function generate() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/tailor-cv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tailoring failed");
      setCv(data.tailored_cv as TailoredCv);
      setBefore(data.before_score);
      setAfter(data.after_score);
      setAfterSummary(data.after_summary);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function safeName(ext: string) {
    const safe = `${job.title}-${job.company ?? "role"}`
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase();
    return `cv-${safe}.${ext}`;
  }

  async function downloadPdf() {
    if (!cv) return;
    setDownloading(true);
    setErr(null);
    try {
      const { cvToBlob } = await import("@/components/cv-pdf");
      const blob = await cvToBlob(cv);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = safeName("pdf");
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(`PDF export failed: ${(e as Error).message}`);
    } finally {
      setDownloading(false);
    }
  }

  async function copyText() {
    if (!cv) return;
    await navigator.clipboard.writeText(cvToPlainText(cv));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const delta =
    before != null && after != null ? after - before : null;

  return (
    <div className="mt-4 space-y-4 rounded-lg border border-brand-600/30 bg-brand-600/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-brand-300">
          Tailor CV to this job
        </p>
        <button
          className={btnGhost}
          onClick={() => setShowNotes((v) => !v)}
          type="button"
        >
          {showNotes ? "Hide notes" : "Emphasis notes"}
        </button>
      </div>

      {!hasProfile && (
        <p className="text-sm text-amber-300">
          Add and extract your CV first (CV Profile) to enable tailoring.
        </p>
      )}

      {showNotes && (
        <div>
          <p className="mb-1 text-xs text-zinc-500">
            Optional: what to emphasise for this role (e.g. &quot;lead with
            AI/automation and operating-model design&quot;). The PDF layout is
            fixed to a professional template. Truthful reframing only - nothing
            is invented.
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={inputCls + " resize-y text-xs leading-relaxed"}
          />
        </div>
      )}

      <button
        onClick={generate}
        disabled={loading || !hasProfile}
        className={btnPrimary}
      >
        {loading
          ? "Tailoring…"
          : cv
          ? "Regenerate tailored CV"
          : "Generate tailored CV"}
      </button>
      {err && <p className="text-sm text-red-400">{err}</p>}

      {cv && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-zinc-400">Match:</span>
            <span className="text-zinc-300">
              Original{" "}
              <span className="font-semibold text-zinc-100">
                {before ?? "-"}
              </span>{" "}
              <span className="text-zinc-500">&rarr;</span> Tailored{" "}
              <span className="font-semibold text-emerald-400">
                {after ?? "-"}
              </span>
            </span>
            {delta != null && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  delta >= 0
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-amber-500/15 text-amber-400"
                }`}
              >
                {delta >= 0 ? `+${delta}` : delta}
              </span>
            )}
          </div>
          {afterSummary && (
            <p className="text-sm text-zinc-400">{afterSummary}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              className={btnPrimary}
              onClick={downloadPdf}
              disabled={downloading}
            >
              {downloading ? "Building PDF…" : "Download PDF"}
            </button>
            <button className={btnSecondary} onClick={copyText}>
              {copied ? "Copied!" : "Copy text"}
            </button>
          </div>

          <CvPreview cv={cv} />
        </div>
      )}
    </div>
  );
}

// On-screen preview that mirrors the PDF layout (white page, dark text).
function CvPreview({ cv }: { cv: TailoredCv }) {
  return (
    <div className="max-h-[28rem] overflow-auto rounded-lg border border-zinc-800 bg-white p-6 text-[11px] leading-snug text-zinc-900">
      <h2 className="text-center text-base font-bold uppercase tracking-wide">
        {cv.name}
      </h2>
      <p className="mt-1 text-center text-zinc-600">{cv.contactLine}</p>
      {cv.summary && <p className="mt-3 text-justify">{cv.summary}</p>}

      {cv.education?.length > 0 && (
        <Section title="Education">
          {cv.education.map((e, i) => (
            <div key={i} className="mt-1.5">
              <div className="flex justify-between gap-2">
                <span className="flex gap-3">
                  <span className="w-16 shrink-0 text-zinc-600">
                    {e.dateRange}
                  </span>
                  <span className="font-bold">{e.institution}</span>
                </span>
                <span className="text-zinc-600">{e.location}</span>
              </div>
              {e.detail && <p className="ml-[4.75rem]">{e.detail}</p>}
            </div>
          ))}
        </Section>
      )}

      {cv.capabilities?.length > 0 && (
        <Section title="Core Capabilities">
          {cv.capabilities.map((c, i) => (
            <p key={i} className="mt-1">
              <span className="font-bold">{c.label}: </span>
              {c.text}
            </p>
          ))}
        </Section>
      )}

      {cv.experience?.length > 0 && (
        <Section title="Experience">
          {cv.experience.map((x, i) => (
            <div key={i} className="mt-2">
              <div className="flex justify-between gap-2">
                <span className="flex gap-3">
                  <span className="w-16 shrink-0 text-zinc-600">
                    {x.dateRange}
                  </span>
                  <span className="font-bold">{x.company}</span>
                </span>
                <span className="text-zinc-600">{x.location}</span>
              </div>
              <div className="ml-[4.75rem]">
                {x.title && <p className="font-bold">{x.title}</p>}
                {(x.bullets ?? []).map((b, j) => (
                  <div key={j}>
                    <p className="flex gap-1.5">
                      <span>&bull;</span>
                      <span>{b.text}</span>
                    </p>
                    {(b.sub ?? []).map((sub, k) => (
                      <p key={k} className="ml-4 flex gap-1.5">
                        <span>o</span>
                        <span>{sub}</span>
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>
      )}

      {cv.certifications && (
        <Section title="Additional Certifications & Training">
          <p className="mt-1">{cv.certifications}</p>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3">
      <h3 className="border-b border-black pb-0.5 text-xs font-bold uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  );
}

function parseStoredPrep(raw: string | null): InterviewPrepData | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as InterviewPrepData;
  } catch {
    return null;
  }
}

function prepToText(p: InterviewPrepData): string {
  const lines: string[] = ["ROLE FOCUS", p.role_focus, ""];
  lines.push("LIKELY QUESTIONS");
  p.questions?.forEach((q, i) => {
    lines.push(`${i + 1}. [${q.category}] ${q.question}`);
    lines.push(`   ${q.suggested_answer}`);
  });
  lines.push("", "KEY STORIES TO HAVE READY");
  p.key_stories?.forEach((s) => {
    lines.push(`- ${s.title}: ${s.situation} (Why it lands: ${s.relevance})`);
  });
  lines.push("", "GAPS TO ADDRESS");
  p.gaps?.forEach((g) => lines.push(`- ${g.concern} -> ${g.how_to_address}`));
  lines.push("", "QUESTIONS TO ASK THEM");
  p.questions_to_ask?.forEach((q) => lines.push(`- ${q}`));
  return lines.join("\n");
}

function InterviewPrep({
  job,
  hasProfile,
}: {
  job: Job;
  hasProfile: boolean;
}) {
  const [prep, setPrep] = useState<InterviewPrepData | null>(
    parseStoredPrep(job.interview_prep)
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/interview-prep`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Interview prep failed");
      setPrep(data.interview_prep as InterviewPrepData);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copyAll() {
    if (!prep) return;
    await navigator.clipboard.writeText(prepToText(prep));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-4 space-y-4 rounded-lg border border-emerald-600/30 bg-emerald-600/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-emerald-300">Interview prep</p>
        {prep && (
          <button className={btnGhost} onClick={copyAll}>
            {copied ? "Copied!" : "Copy all"}
          </button>
        )}
      </div>

      {!hasProfile && (
        <p className="text-sm text-amber-300">
          Add and extract your CV first (CV Profile) to enable interview prep.
        </p>
      )}

      <button
        onClick={generate}
        disabled={loading || !hasProfile}
        className={btnPrimary}
      >
        {loading
          ? "Preparing…"
          : prep
          ? "Regenerate prep"
          : "Generate interview prep"}
      </button>
      {err && <p className="text-sm text-red-400">{err}</p>}

      {prep && (
        <div className="space-y-5 text-sm">
          {prep.role_focus && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                What this role needs
              </p>
              <p className="text-zinc-300">{prep.role_focus}</p>
            </div>
          )}

          {prep.questions?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Likely questions
              </p>
              <div className="space-y-3">
                {prep.questions.map((q, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="font-medium text-zinc-100">{q.question}</p>
                      <Chip tone="brand">{q.category}</Chip>
                    </div>
                    <p className="text-zinc-400">{q.suggested_answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {prep.key_stories?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Stories to have ready
              </p>
              <ul className="space-y-2">
                {prep.key_stories.map((s, i) => (
                  <li key={i} className="text-zinc-300">
                    <span className="font-medium text-zinc-100">{s.title}.</span>{" "}
                    {s.situation}{" "}
                    <span className="text-zinc-500">— {s.relevance}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {prep.gaps?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Gaps to address
              </p>
              <ul className="space-y-2">
                {prep.gaps.map((g, i) => (
                  <li key={i} className="text-zinc-300">
                    <span className="font-medium text-amber-300">
                      {g.concern}.
                    </span>{" "}
                    {g.how_to_address}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {prep.questions_to_ask?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Questions to ask them
              </p>
              <ul className="list-disc space-y-1 pl-5 text-zinc-300">
                {prep.questions_to_ask.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function JobRow({
  job,
  onPatch,
  onRefetch,
  cvFormat,
  hasProfile,
}: {
  job: Job;
  onPatch: (id: string, patch: Partial<Job>) => void;
  onRefetch: () => Promise<void> | void;
  cvFormat: string;
  hasProfile: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showTailor, setShowTailor] = useState(false);
  const [showPrep, setShowPrep] = useState(false);
  const [notes, setNotes] = useState(job.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [rescoring, setRescoring] = useState(false);

  async function rescore() {
    setRescoring(true);
    try {
      const res = await fetch("/api/jobs/rescore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [job.id] }),
      });
      if (res.ok) await onRefetch();
    } finally {
      setRescoring(false);
    }
  }

  async function setStatus(status: string) {
    onPatch(job.id, { status: status as Job["status"] });
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      onPatch(job.id, { notes });
    } finally {
      setSavingNotes(false);
    }
  }

  return (
    <Card className="!p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-zinc-100">{job.title}</h3>
            <MatchBadgePill score={job.match_score} />
          </div>
          <p className="mt-0.5 text-sm text-zinc-400">
            {[job.company, job.location].filter(Boolean).join(" · ") || "—"}
            {job.salary ? ` · ${job.salary}` : ""}
          </p>
          {job.fit_summary && (
            <p className="mt-2 max-w-2xl text-sm text-zinc-300">{job.fit_summary}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
            Status
          </span>
          <select
            value={job.status}
            onChange={(e) => setStatus(e.target.value)}
            className={`cursor-pointer rounded-lg border-0 px-3 py-1.5 text-xs font-semibold outline-none ${
              JOB_STATUS_TONE[job.status] ?? "bg-zinc-700 text-zinc-100"
            }`}
          >
            {JOB_STATUSES.map((st) => (
              <option key={st} className="bg-zinc-900 text-zinc-100">
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className={btnGhost} onClick={() => setOpen((o) => !o)}>
          {open ? "Hide details" : "Details & notes"}
        </button>
        <button className={btnGhost} onClick={rescore} disabled={rescoring}>
          {rescoring ? "Re-scoring…" : "Re-score"}
        </button>
        <button
          className={btnGhost + " !text-brand-400"}
          onClick={() => setShowTailor((s) => !s)}
        >
          {job.tailored_cv ? "Tailored CV ✓" : "Tailor CV"}
        </button>
        <button
          className={btnGhost + " !text-brand-400"}
          onClick={() => setShowPrep((s) => !s)}
        >
          {job.interview_prep ? "Interview prep ✓" : "Interview prep"}
        </button>
        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className={btnGhost}
          >
            View / apply ↗
          </a>
        )}
        <Link href={`/contacts?job=${job.id}`} className={btnGhost}>
          + Add contact
        </Link>
      </div>

      {showTailor && (
        <TailorCv job={job} cvFormat={cvFormat} hasProfile={hasProfile} />
      )}

      {showPrep && <InterviewPrep job={job} hasProfile={hasProfile} />}

      {open && (
        <div className="mt-4 space-y-4 border-t border-zinc-800 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {job.strengths.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-emerald-400">
                  Strengths
                </p>
                <ul className="list-disc space-y-1 pl-4 text-sm text-zinc-300">
                  {job.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {job.gaps.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-amber-400">Gaps</p>
                <ul className="list-disc space-y-1 pl-4 text-sm text-zinc-300">
                  {job.gaps.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {job.description && (
            <details className="text-sm text-zinc-400">
              <summary className="cursor-pointer text-zinc-300">
                Job description
              </summary>
              <p className="mt-2 whitespace-pre-wrap">{job.description}</p>
            </details>
          )}

          <div>
            <p className="mb-1 text-xs font-medium text-zinc-400">Your notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={inputCls + " resize-y"}
              placeholder="Add a personal note about this role…"
            />
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className={btnSecondary + " mt-2"}
            >
              {savingNotes ? "Saving…" : "Save note"}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Chip tone="muted">Source: {job.source ?? "—"}</Chip>
            <Chip tone="muted">
              Added {new Date(job.created_at).toLocaleDateString()}
            </Chip>
          </div>
        </div>
      )}
    </Card>
  );
}
