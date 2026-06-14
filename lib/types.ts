// Shared data model types for JobHunt.

export type SearchPreferences = {
  target_roles: string[];
  target_industries: string[];
  target_firms: string[];
  seniority: string;
  locations: string[];
  salary_min: number | null;
  salary_max: number | null;
};

export type CvProfile = {
  id: string;
  raw_text: string;
  extracted_skills: string[];
  extracted_industries: string[];
  seniority: string | null;
  years_experience: number | null;
  notable_employers: string[];
  summary: string | null;
  search_preferences: SearchPreferences;
  cv_format: string | null;
  model: string | null;
  updated_at: string;
};

// ---- Selectable Claude models (ids per the Anthropic API) ----
export const AVAILABLE_MODELS: { id: string; label: string; short: string }[] = [
  { id: "claude-opus-4-8", label: "Claude Opus 4.8 - most capable", short: "Opus 4.8" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 - balanced", short: "Sonnet 4.6" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 - fastest", short: "Haiku 4.5" },
];

export const DEFAULT_MODEL = "claude-sonnet-4-6";

// Optional, free-text emphasis notes the user can attach to tailoring (e.g.
// "lead with AI/automation experience"). The PDF LAYOUT itself is fixed to a
// professional template; these notes only steer content emphasis.
export const DEFAULT_CV_FORMAT = "";

// ---- Structured tailored CV (rendered to a fixed-layout PDF) ----
export type CvBullet = { text: string; sub?: string[] };

export type CvExperienceEntry = {
  dateRange?: string;
  company: string;
  location?: string;
  title?: string;
  bullets: CvBullet[];
};

export type CvEducationEntry = {
  dateRange?: string;
  institution: string;
  location?: string;
  detail?: string;
};

export type CvCapability = { label: string; text: string };

export type TailoredCv = {
  name: string;
  contactLine: string;
  summary: string;
  capabilities: CvCapability[];
  education: CvEducationEntry[];
  experience: CvExperienceEntry[];
  certifications?: string;
};

// Replace en/em dashes and minus signs with a plain hyphen everywhere.
export function stripDashes<T>(value: T): T {
  if (typeof value === "string") {
    return value.replace(/[‒–—―−]/g, "-") as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => stripDashes(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = stripDashes(v);
    return out as T;
  }
  return value;
}

// Flatten a structured CV to plain text (used for match scoring).
export function cvToPlainText(cv: TailoredCv): string {
  const lines: string[] = [cv.name, cv.contactLine, "", cv.summary, ""];
  if (cv.education?.length) {
    lines.push("EDUCATION");
    for (const e of cv.education) {
      lines.push(
        [e.dateRange, e.institution, e.location].filter(Boolean).join(" ")
      );
      if (e.detail) lines.push(e.detail);
    }
    lines.push("");
  }
  if (cv.capabilities?.length) {
    lines.push("CORE CAPABILITIES");
    for (const c of cv.capabilities) lines.push(`${c.label}: ${c.text}`);
    lines.push("");
  }
  if (cv.experience?.length) {
    lines.push("EXPERIENCE");
    for (const x of cv.experience) {
      lines.push(
        [x.dateRange, x.company, x.location].filter(Boolean).join(" ")
      );
      if (x.title) lines.push(x.title);
      for (const b of x.bullets ?? []) {
        lines.push(`- ${b.text}`);
        for (const s of b.sub ?? []) lines.push(`  - ${s}`);
      }
    }
    lines.push("");
  }
  if (cv.certifications) {
    lines.push("ADDITIONAL CERTIFICATIONS & TRAINING");
    lines.push(cv.certifications);
  }
  return lines.join("\n");
}

// Result of the Claude CV-extraction call.
export type CvExtraction = {
  extracted_skills: string[];
  extracted_industries: string[];
  seniority: string;
  years_experience: number;
  notable_employers: string[];
  summary: string;
};

export type JobStatus =
  | "New"
  | "Interested"
  | "Uninterested"
  | "Applied"
  | "Interviewing"
  | "Rejected"
  | "Closed";

export const JOB_STATUSES: JobStatus[] = [
  "New",
  "Interested",
  "Uninterested",
  "Applied",
  "Interviewing",
  "Rejected",
  "Closed",
];

export type Job = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  salary: string | null;
  description: string | null;
  url: string | null;
  source: string | null;
  match_score: number | null;
  fit_summary: string | null;
  strengths: string[];
  gaps: string[];
  status: JobStatus;
  notes: string | null;
  tailored_cv: string | null;
  tailored_score: number | null;
  tailored_at: string | null;
  interview_prep: string | null;
  interview_prep_at: string | null;
  created_at: string;
  updated_at: string;
};

// ---- Interview prep (generated per job) ----
export type InterviewQuestion = {
  question: string;
  category: string; // e.g. Behavioural, Technical, Commercial, Motivation
  suggested_answer: string;
};

export type InterviewStory = {
  title: string;
  situation: string; // drawn from the candidate's real experience
  relevance: string; // why it lands for this role
};

export type InterviewGap = {
  concern: string;
  how_to_address: string;
};

export type InterviewPrep = {
  role_focus: string; // what the role really needs
  questions: InterviewQuestion[];
  key_stories: InterviewStory[];
  gaps: InterviewGap[];
  questions_to_ask: string[];
};

// Result of the Claude job-matching call.
export type JobMatch = {
  match_score: number;
  fit_summary: string;
  strengths: string[];
  gaps: string[];
};

export type RelationshipType = "warm" | "cold" | "mutual connection";

export type ContactStatus =
  | "To Contact"
  | "Reached Out"
  | "Responded"
  | "Meeting Booked"
  | "Not Relevant";

export const CONTACT_STATUSES: ContactStatus[] = [
  "To Contact",
  "Reached Out",
  "Responded",
  "Meeting Booked",
  "Not Relevant",
];

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  "warm",
  "cold",
  "mutual connection",
];

export type Contact = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  linkedin_url: string | null;
  email: string | null;
  phone: string | null;
  relationship_type: RelationshipType;
  status: ContactStatus;
  source: string | null;
  linked_job_id: string | null;
  generated_message: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// Match badge helper shared by UI.
export type MatchBadge = "Strong" | "Good" | "Partial" | "Weak";

export function matchBadge(score: number | null | undefined): MatchBadge | null {
  if (score == null) return null;
  if (score >= 80) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 40) return "Partial";
  return "Weak";
}
