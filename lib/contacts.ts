import { getSupabase } from "./supabase";
import type { Contact, ContactStatus, RelationshipType } from "./types";

export function normalizeContact(row: Record<string, unknown>): Contact {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    title: (row.title as string) ?? null,
    company: (row.company as string) ?? null,
    linkedin_url: (row.linkedin_url as string) ?? null,
    email: (row.email as string) ?? null,
    phone: (row.phone as string) ?? null,
    relationship_type: ((row.relationship_type as RelationshipType) ??
      "cold") as RelationshipType,
    status: ((row.status as ContactStatus) ?? "To Contact") as ContactStatus,
    source: (row.source as string) ?? null,
    linked_job_id: (row.linked_job_id as string) ?? null,
    generated_message: (row.generated_message as string) ?? null,
    notes: (row.notes as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export type ContactFilters = {
  status?: string;
  company?: string;
  relationship_type?: string;
};

export async function listContacts(
  filters: ContactFilters = {}
): Promise<Contact[]> {
  const supabase = getSupabase();
  let query = supabase
    .from("contacts")
    .select("*")
    .order("updated_at", { ascending: false });

  if (filters.status && filters.status !== "All")
    query = query.eq("status", filters.status);
  if (filters.relationship_type && filters.relationship_type !== "All")
    query = query.eq("relationship_type", filters.relationship_type);
  if (filters.company) query = query.ilike("company", `%${filters.company}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeContact);
}

export async function getContact(id: string): Promise<Contact | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalizeContact(data) : null;
}

export async function createContact(
  input: Partial<Contact>
): Promise<Contact> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      name: input.name,
      title: input.title ?? null,
      company: input.company ?? null,
      linkedin_url: input.linkedin_url ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      relationship_type: input.relationship_type ?? "cold",
      status: input.status ?? "To Contact",
      source: input.source ?? null,
      linked_job_id: input.linked_job_id ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeContact(data);
}

export async function updateContact(
  id: string,
  patch: Partial<Contact>
): Promise<Contact> {
  const supabase = getSupabase();
  const allowed: (keyof Contact)[] = [
    "name",
    "title",
    "company",
    "linkedin_url",
    "email",
    "phone",
    "relationship_type",
    "status",
    "source",
    "linked_job_id",
    "generated_message",
    "notes",
  ];
  const clean: Record<string, unknown> = {};
  for (const k of allowed) if (k in patch) clean[k] = patch[k];

  const { data, error } = await supabase
    .from("contacts")
    .update(clean)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeContact(data);
}

export async function deleteContact(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
