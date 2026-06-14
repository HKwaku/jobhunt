"use client";

import { useState } from "react";
import type { CvProfile, SearchPreferences } from "@/lib/types";
import { DEFAULT_CV_FORMAT } from "@/lib/types";
import { Card, Chip } from "@/components/ui";
import { inputCls, labelCls, btnPrimary, btnSecondary } from "@/lib/styles";

const csv = (a: string[] | undefined) => (a ?? []).join(", ");
const splitCsv = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export default function ProfileEditor({
  initial,
}: {
  initial: CvProfile | null;
}) {
  const [profile, setProfile] = useState<CvProfile | null>(initial);
  const [text, setText] = useState(initial?.raw_text ?? "");
  const [extracting, setExtracting] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [cvFormat, setCvFormat] = useState(
    initial?.cv_format ?? DEFAULT_CV_FORMAT
  );
  const [savingFormat, setSavingFormat] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "warn" | "err"; text: string } | null>(
    null
  );

  const prefs = profile?.search_preferences;
  const [form, setForm] = useState({
    target_roles: csv(prefs?.target_roles),
    target_industries: csv(prefs?.target_industries),
    target_firms: csv(prefs?.target_firms),
    seniority: prefs?.seniority ?? "",
    locations: csv(prefs?.locations),
    salary_min: prefs?.salary_min?.toString() ?? "",
    salary_max: prefs?.salary_max?.toString() ?? "",
  });

  async function onPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/cv/parse-pdf", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "PDF parse failed");
      setText(data.text);
      setMsg({ kind: "ok", text: "PDF text loaded — review then Save & Extract." });
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message });
    } finally {
      setExtracting(false);
      e.target.value = "";
    }
  }

  async function saveAndExtract() {
    setMsg(null);
    setExtracting(true);
    try {
      const res = await fetch("/api/cv/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      setProfile(data.profile);
      setMsg(
        data.warning
          ? { kind: "warn", text: data.warning }
          : { kind: "ok", text: "CV saved and profile extracted." }
      );
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message });
    } finally {
      setExtracting(false);
    }
  }

  async function saveFormat() {
    setMsg(null);
    setSavingFormat(true);
    try {
      const res = await fetch("/api/cv", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_format: cvFormat }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setProfile(data.profile);
      setMsg({ kind: "ok", text: "CV format template saved." });
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message });
    } finally {
      setSavingFormat(false);
    }
  }

  async function savePrefs() {
    setMsg(null);
    setSavingPrefs(true);
    try {
      const search_preferences: SearchPreferences = {
        target_roles: splitCsv(form.target_roles),
        target_industries: splitCsv(form.target_industries),
        target_firms: splitCsv(form.target_firms),
        seniority: form.seniority.trim(),
        locations: splitCsv(form.locations),
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
      };
      const res = await fetch("/api/cv", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ search_preferences }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setProfile(data.profile);
      setMsg({ kind: "ok", text: "Search preferences saved." });
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message });
    } finally {
      setSavingPrefs(false);
    }
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-sm ${
            msg.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : msg.kind === "warn"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CV upload / paste */}
        <Card>
          <h2 className="text-sm font-semibold text-zinc-200">Your CV</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Upload a PDF or paste the text. Saving runs Claude to extract skills,
            experience and a summary.
          </p>

          <div className="mt-4">
            <label className={btnSecondary + " cursor-pointer"}>
              Upload PDF
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={onPdf}
                disabled={extracting}
              />
            </label>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your CV text here…"
            rows={12}
            className={inputCls + " mt-4 resize-y font-mono text-xs leading-relaxed"}
          />

          <button
            onClick={saveAndExtract}
            disabled={extracting || text.trim().length < 30}
            className={btnPrimary + " mt-4"}
          >
            {extracting ? "Working…" : "Save & Extract"}
          </button>
        </Card>

        {/* Extracted profile */}
        <Card>
          <h2 className="text-sm font-semibold text-zinc-200">Extracted profile</h2>
          {profile && (profile.summary || profile.extracted_skills.length) ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <div className={labelCls}>Seniority</div>
                  <div className="text-zinc-200">{profile.seniority ?? "—"}</div>
                </div>
                <div>
                  <div className={labelCls}>Experience</div>
                  <div className="text-zinc-200">
                    {profile.years_experience != null
                      ? `${profile.years_experience} yrs`
                      : "—"}
                  </div>
                </div>
              </div>

              {profile.summary && (
                <div>
                  <div className={labelCls}>Summary</div>
                  <p className="text-sm leading-relaxed text-zinc-300">
                    {profile.summary}
                  </p>
                </div>
              )}

              <ChipRow label="Skills" items={profile.extracted_skills} />
              <ChipRow label="Industries" items={profile.extracted_industries} />
              <ChipRow label="Notable employers" items={profile.notable_employers} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              No profile extracted yet. Add your CV and click Save &amp; Extract.
            </p>
          )}
        </Card>
      </div>

      {/* Search preferences */}
      <Card>
        <h2 className="text-sm font-semibold text-zinc-200">Search preferences</h2>
        <p className="mt-1 text-xs text-zinc-500">
          These drive job search and matching. Use commas to separate multiple
          values.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Target roles"
            value={form.target_roles}
            onChange={(v) => setForm({ ...form, target_roles: v })}
            placeholder="Product Manager, Strategy Lead"
          />
          <Field
            label="Target industries"
            value={form.target_industries}
            onChange={(v) => setForm({ ...form, target_industries: v })}
            placeholder="Fintech, SaaS"
          />
          <Field
            label="Target firms"
            value={form.target_firms}
            onChange={(v) => setForm({ ...form, target_firms: v })}
            placeholder="Stripe, Monzo"
          />
          <Field
            label="Seniority"
            value={form.seniority}
            onChange={(v) => setForm({ ...form, seniority: v })}
            placeholder="Senior"
          />
          <Field
            label="Locations"
            value={form.locations}
            onChange={(v) => setForm({ ...form, locations: v })}
            placeholder="London, Remote"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Salary min"
              value={form.salary_min}
              onChange={(v) => setForm({ ...form, salary_min: v })}
              placeholder="60000"
              type="number"
            />
            <Field
              label="Salary max"
              value={form.salary_max}
              onChange={(v) => setForm({ ...form, salary_max: v })}
              placeholder="90000"
              type="number"
            />
          </div>
        </div>
        <button
          onClick={savePrefs}
          disabled={savingPrefs}
          className={btnPrimary + " mt-5"}
        >
          {savingPrefs ? "Saving…" : "Save preferences"}
        </button>
      </Card>

      {/* CV tailoring notes (used by per-job CV tailoring) */}
      <Card>
        <h2 className="text-sm font-semibold text-zinc-200">
          CV tailoring notes
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Optional default guidance for when you tailor your CV to a job (Jobs →
          Tailor CV) — e.g. &quot;lead with AI/automation and operating-model
          design&quot;. The tailored CV is exported as a PDF in a fixed
          professional layout; tailoring only reframes your real experience,
          never invents it. You can override these notes per job.
        </p>
        <textarea
          value={cvFormat}
          onChange={(e) => setCvFormat(e.target.value)}
          rows={3}
          placeholder="e.g. Emphasise transformation delivery and AI/automation; foreground regulated financial services."
          className={inputCls + " mt-4 resize-y text-sm leading-relaxed"}
        />
        <button
          onClick={saveFormat}
          disabled={savingFormat}
          className={btnPrimary + " mt-4"}
        >
          {savingFormat ? "Saving…" : "Save tailoring notes"}
        </button>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  );
}

function ChipRow({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className={labelCls}>{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => (
          <Chip key={s}>{s}</Chip>
        ))}
      </div>
    </div>
  );
}
