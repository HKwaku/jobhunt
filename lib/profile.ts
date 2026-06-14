import { getSupabase } from "./supabase";
import type { CvProfile, SearchPreferences } from "./types";

export const DEFAULT_PREFERENCES: SearchPreferences = {
  target_roles: [],
  target_industries: [],
  target_firms: [],
  seniority: "",
  locations: [],
  salary_min: null,
  salary_max: null,
};

function normalize(row: Record<string, unknown>): CvProfile {
  return {
    id: row.id as string,
    raw_text: (row.raw_text as string) ?? "",
    extracted_skills: (row.extracted_skills as string[]) ?? [],
    extracted_industries: (row.extracted_industries as string[]) ?? [],
    seniority: (row.seniority as string) ?? null,
    years_experience: (row.years_experience as number) ?? null,
    notable_employers: (row.notable_employers as string[]) ?? [],
    summary: (row.summary as string) ?? null,
    search_preferences: {
      ...DEFAULT_PREFERENCES,
      ...((row.search_preferences as Partial<SearchPreferences>) ?? {}),
    },
    cv_format: (row.cv_format as string) ?? null,
    model: (row.model as string) ?? null,
    updated_at: row.updated_at as string,
  };
}

// Returns the single CV profile, or null if none exists yet.
export async function getProfile(): Promise<CvProfile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("cv_profile")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalize(data) : null;
}

// Insert or update the single profile row, returning the saved profile.
export async function upsertProfile(
  patch: Partial<Omit<CvProfile, "id" | "updated_at">>
): Promise<CvProfile> {
  const supabase = getSupabase();
  const existing = await getProfile();

  if (existing) {
    const { data, error } = await supabase
      .from("cv_profile")
      .update(patch)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return normalize(data);
  }

  const { data, error } = await supabase
    .from("cv_profile")
    .insert({ search_preferences: DEFAULT_PREFERENCES, ...patch })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalize(data);
}
