"use client";

import { useEffect, useState } from "react";
import { AVAILABLE_MODELS, DEFAULT_MODEL } from "@/lib/types";

// Global AI-model picker, mounted in the left nav so it's available on every
// page. Reads/writes the model on the single CV profile via /api/cv.
export default function ModelSelector() {
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/cv")
      .then((r) => r.json())
      .then((d) => {
        if (active && d?.profile?.model) setModel(d.profile.model);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function change(next: string) {
    const prev = model;
    setModel(next);
    setSaving(true);
    try {
      const res = await fetch("/api/cv", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setModel(prev); // revert on failure
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <label className="mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        <span>AI model</span>
        {saving && <span className="text-zinc-600">saving…</span>}
      </label>
      <select
        value={model}
        onChange={(e) => change(e.target.value)}
        disabled={!ready || saving}
        title="The Claude model used for extraction, matching, tailoring, outreach and interview prep"
        className="w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-brand-500 disabled:opacity-50"
      >
        {AVAILABLE_MODELS.map((m) => (
          <option key={m.id} value={m.id} className="bg-zinc-900">
            {m.short}
          </option>
        ))}
      </select>
    </div>
  );
}
