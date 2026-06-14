"use client";

import { useCallback, useEffect, useState } from "react";
import type { Contact } from "@/lib/types";
import { CONTACT_STATUSES, RELATIONSHIP_TYPES } from "@/lib/types";
import { Card, Chip, EmptyState } from "@/components/ui";
import { inputCls, labelCls, btnPrimary, btnSecondary, btnGhost } from "@/lib/styles";

export type JobOption = { id: string; title: string; company: string | null };

const STATUS_TONE: Record<string, string> = {
  "To Contact": "bg-zinc-700 text-zinc-200",
  "Reached Out": "bg-sky-500/15 text-sky-300",
  Responded: "bg-indigo-500/15 text-indigo-300",
  "Meeting Booked": "bg-emerald-500/15 text-emerald-300",
  "Not Relevant": "bg-zinc-800 text-zinc-500",
};

type Msg = { kind: "ok" | "err"; text: string } | null;

const emptyForm = {
  name: "",
  title: "",
  company: "",
  linkedin_url: "",
  email: "",
  phone: "",
  relationship_type: "cold",
  status: "To Contact",
  linked_job_id: "",
  notes: "",
};

export default function ContactsBoard({
  initial,
  jobs,
  presetJobId,
}: {
  initial: Contact[];
  jobs: JobOption[];
  presetJobId?: string;
}) {
  const [contacts, setContacts] = useState<Contact[]>(initial);
  const [msg, setMsg] = useState<Msg>(null);
  const [showForm, setShowForm] = useState(Boolean(presetJobId));
  const [form, setForm] = useState({
    ...emptyForm,
    linked_job_id: presetJobId ?? "",
  });
  const [saving, setSaving] = useState(false);

  // filters
  const [fStatus, setFStatus] = useState("All");
  const [fRel, setFRel] = useState("All");
  const [fCompany, setFCompany] = useState("");

  const refetch = useCallback(async () => {
    const qs = new URLSearchParams();
    if (fStatus !== "All") qs.set("status", fStatus);
    if (fRel !== "All") qs.set("relationship_type", fRel);
    if (fCompany.trim()) qs.set("company", fCompany.trim());
    const res = await fetch(`/api/contacts?${qs.toString()}`);
    const data = await res.json();
    if (res.ok) setContacts(data.contacts);
  }, [fStatus, fRel, fCompany]);

  useEffect(() => {
    const t = setTimeout(refetch, 250);
    return () => clearTimeout(t);
  }, [refetch]);

  async function addContact() {
    setMsg(null);
    if (!form.name.trim()) {
      setMsg({ kind: "err", text: "Name is required." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        linked_job_id: form.linked_job_id || null,
      };
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add contact");
      setForm({ ...emptyForm });
      setShowForm(false);
      setMsg({ kind: "ok", text: `Added ${data.contact.name}.` });
      await refetch();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  function patchLocal(id: string, patch: Partial<Contact>) {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function removeLocal(id: string) {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setShowForm((s) => !s)} className={btnPrimary}>
          {showForm ? "Close form" : "+ Add contact"}
        </button>
        <a href="/api/contacts/export" className={btnSecondary}>
          Export CSV
        </a>
        {msg && (
          <span
            className={`text-sm ${
              msg.kind === "ok" ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {msg.text}
          </span>
        )}
      </div>

      {showForm && (
        <Card>
          <h2 className="text-sm font-semibold text-zinc-200">New contact</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <FormField label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
            <FormField label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
            <FormField label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <FormField label="LinkedIn URL" value={form.linkedin_url} onChange={(v) => setForm({ ...form, linkedin_url: v })} />
            <FormField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <div>
              <label className={labelCls}>Relationship</label>
              <select
                className={inputCls}
                value={form.relationship_type}
                onChange={(e) => setForm({ ...form, relationship_type: e.target.value })}
              >
                {RELATIONSHIP_TYPES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Linked job</label>
              <select
                className={inputCls}
                value={form.linked_job_id}
                onChange={(e) => setForm({ ...form, linked_job_id: e.target.value })}
              >
                <option value="">— none —</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                    {j.company ? ` · ${j.company}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea
                className={inputCls + " resize-y"}
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <button onClick={addContact} disabled={saving} className={btnPrimary + " mt-4"}>
            {saving ? "Saving…" : "Save contact"}
          </button>
        </Card>
      )}

      {/* filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          className={inputCls + " max-w-xs"}
          placeholder="Filter by company…"
          value={fCompany}
          onChange={(e) => setFCompany(e.target.value)}
        />
        <select className={inputCls + " w-auto"} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option>All</option>
          {CONTACT_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select className={inputCls + " w-auto"} value={fRel} onChange={(e) => setFRel(e.target.value)}>
          <option>All</option>
          {RELATIONSHIP_TYPES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <span className="text-xs text-zinc-500">
          {contacts.length} contact{contacts.length === 1 ? "" : "s"}
        </span>
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          title="No contacts yet"
          body="Add people you want to reach out to, link them to jobs, and generate tailored outreach."
        />
      ) : (
        <div className="space-y-3">
          {contacts.map((c) => (
            <ContactRow
              key={c.id}
              contact={c}
              jobs={jobs}
              onPatch={patchLocal}
              onRemove={removeLocal}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ContactRow({
  contact,
  jobs,
  onPatch,
  onRemove,
}: {
  contact: Contact;
  jobs: JobOption[];
  onPatch: (id: string, patch: Partial<Contact>) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const linkedJob = jobs.find((j) => j.id === contact.linked_job_id);

  async function patch(p: Partial<Contact>) {
    onPatch(contact.id, p);
    await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
  }

  async function generate() {
    setErr(null);
    setGenerating(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/message`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      onPatch(contact.id, { generated_message: data.contact.generated_message });
      setOpen(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function copy() {
    if (!contact.generated_message) return;
    await navigator.clipboard.writeText(contact.generated_message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function remove() {
    if (!confirm(`Delete ${contact.name}?`)) return;
    onRemove(contact.id);
    await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
  }

  return (
    <Card className="!p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-zinc-100">{contact.name}</h3>
            <Chip>{contact.relationship_type}</Chip>
          </div>
          <p className="mt-0.5 text-sm text-zinc-400">
            {[contact.title, contact.company].filter(Boolean).join(" · ") || "—"}
          </p>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
            {contact.email && <span>{contact.email}</span>}
            {contact.phone && <span>{contact.phone}</span>}
            {contact.linkedin_url && (
              <a
                href={contact.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="text-brand-400 hover:underline"
              >
                LinkedIn ↗
              </a>
            )}
            {linkedJob && <span>↳ {linkedJob.title}</span>}
          </div>
        </div>

        <select
          value={contact.status}
          onChange={(e) => patch({ status: e.target.value as Contact["status"] })}
          className={`rounded-lg border-0 px-2.5 py-1.5 text-xs font-medium ${
            STATUS_TONE[contact.status] ?? "bg-zinc-700 text-zinc-200"
          }`}
        >
          {CONTACT_STATUSES.map((s) => (
            <option key={s} className="bg-zinc-900 text-zinc-100">
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className={btnGhost} onClick={() => setOpen((o) => !o)}>
          {open ? "Hide" : "Details"}
        </button>
        <button className={btnGhost} onClick={generate} disabled={generating}>
          {generating
            ? "Generating…"
            : contact.generated_message
            ? "Regenerate message"
            : "Generate outreach"}
        </button>
        <button className={btnGhost + " !text-red-400"} onClick={remove}>
          Delete
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}

      {open && (
        <div className="mt-4 space-y-4 border-t border-zinc-800 pt-4">
          {/* timeline */}
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="muted">
              Added {new Date(contact.created_at).toLocaleDateString()}
            </Chip>
            <Chip tone="muted">
              Updated {new Date(contact.updated_at).toLocaleString()}
            </Chip>
            <Chip tone="muted">Status: {contact.status}</Chip>
          </div>

          {/* linked job control */}
          <div className="max-w-sm">
            <label className={labelCls}>Linked job</label>
            <select
              className={inputCls}
              value={contact.linked_job_id ?? ""}
              onChange={(e) => patch({ linked_job_id: e.target.value || null })}
            >
              <option value="">— none —</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                  {j.company ? ` · ${j.company}` : ""}
                </option>
              ))}
            </select>
          </div>

          {contact.generated_message && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className={labelCls + " !mb-0"}>Outreach message</span>
                <button className={btnGhost} onClick={copy}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-200">
                {contact.generated_message}
              </p>
            </div>
          )}

          {contact.notes && (
            <div>
              <span className={labelCls}>Notes</span>
              <p className="whitespace-pre-wrap text-sm text-zinc-300">
                {contact.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
