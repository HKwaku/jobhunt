import { listContacts } from "@/lib/contacts";

export const dynamic = "force-dynamic";

function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  // Quote and escape per RFC 4180.
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const COLUMNS: { key: string; header: string }[] = [
  { key: "name", header: "Name" },
  { key: "title", header: "Title" },
  { key: "company", header: "Company" },
  { key: "email", header: "Email" },
  { key: "phone", header: "Phone" },
  { key: "linkedin_url", header: "LinkedIn" },
  { key: "relationship_type", header: "Relationship" },
  { key: "status", header: "Status" },
  { key: "source", header: "Source" },
  { key: "notes", header: "Notes" },
  { key: "generated_message", header: "Outreach message" },
  { key: "created_at", header: "Created" },
];

export async function GET() {
  try {
    const contacts = await listContacts();
    const head = COLUMNS.map((c) => esc(c.header)).join(",");
    const rows = contacts.map((c) =>
      COLUMNS.map((col) => esc((c as Record<string, unknown>)[col.key])).join(",")
    );
    const csv = [head, ...rows].join("\r\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="contacts.csv"',
      },
    });
  } catch (e) {
    return new Response((e as Error).message, { status: 500 });
  }
}
