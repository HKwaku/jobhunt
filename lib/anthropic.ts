import Anthropic from "@anthropic-ai/sdk";
import type {
  CvExtraction,
  CvProfile,
  JobMatch,
  Contact,
  Job,
  TailoredCv,
  InterviewPrep,
} from "./types";
import { stripDashes, DEFAULT_MODEL, JOB_INDUSTRIES } from "./types";

let cached: Anthropic | null = null;

function getClient(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Anthropic is not configured. Set ANTHROPIC_API_KEY in .env.local."
    );
  }
  cached = new Anthropic({ apiKey });
  return cached;
}

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Pull the text out of a messages response.
function textOf(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

// Robustly parse JSON that may be wrapped in prose or ```json fences.
function parseJson<T>(raw: string): T {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // Fall back to the first {...} or [...] block.
  if (!s.startsWith("{") && !s.startsWith("[")) {
    const obj = s.indexOf("{");
    const arr = s.indexOf("[");
    const start =
      obj === -1 ? arr : arr === -1 ? obj : Math.min(obj, arr);
    if (start >= 0) s = s.slice(start);
    const lastObj = s.lastIndexOf("}");
    const lastArr = s.lastIndexOf("]");
    const end = Math.max(lastObj, lastArr);
    if (end >= 0) s = s.slice(0, end + 1);
  }
  return JSON.parse(s) as T;
}

async function claudeJson<T>(
  system: string,
  user: string,
  maxTokens = 1500,
  model: string = DEFAULT_MODEL
): Promise<T> {
  const msg = await getClient().messages.create({
    model: model || DEFAULT_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  return parseJson<T>(textOf(msg));
}

// ---- Module 1: CV extraction ----
export async function extractCvProfile(
  cvText: string,
  model?: string
): Promise<CvExtraction> {
  const system =
    "You are an expert technical recruiter. Extract structured data from a CV. " +
    "Respond with ONLY a single JSON object, no prose, no markdown fences.";
  const user = `From the CV below, extract a JSON object with exactly these keys:
- "extracted_skills": string[] (key hard and soft skills, max 20)
- "extracted_industries": string[] (industries the person has worked in)
- "seniority": string (one of: Intern, Junior, Mid, Senior, Lead, Principal, Director, VP, C-level)
- "years_experience": number (total years of professional experience, your best estimate)
- "notable_employers": string[] (most recognisable past employers, max 8)
- "summary": string (a ~200 word professional summary written in the third person)

CV:
"""
${cvText.slice(0, 24000)}
"""`;
  return claudeJson<CvExtraction>(system, user, 1500, model);
}

// ---- Module 2: Job matching ----
export async function scoreJobMatch(
  profile: CvProfile,
  job: { title: string; company?: string | null; description?: string | null },
  model?: string
): Promise<JobMatch> {
  const system =
    "You are an expert career coach scoring how well a candidate matches a job. " +
    "Be honest and calibrated. Respond with ONLY a single JSON object.";
  const prefs = profile.search_preferences;
  const user = `Score the match between this candidate and job from 0-100.

CANDIDATE PROFILE:
- Seniority: ${profile.seniority ?? "unknown"}
- Years experience: ${profile.years_experience ?? "unknown"}
- Skills: ${(profile.extracted_skills ?? []).join(", ")}
- Industries: ${(profile.extracted_industries ?? []).join(", ")}
- Notable employers: ${(profile.notable_employers ?? []).join(", ")}
- Target roles: ${(prefs?.target_roles ?? []).join(", ")}
- Target seniority: ${prefs?.seniority ?? "any"}
- Summary: ${profile.summary ?? ""}

JOB:
- Title: ${job.title}
- Company: ${job.company ?? "unknown"}
- Description: ${(job.description ?? "").slice(0, 8000)}

Return a JSON object with exactly these keys:
- "match_score": number 0-100
- "fit_summary": string (2-3 sentences on why it is or isn't a strong fit)
- "strengths": string[] (specific matching points)
- "gaps": string[] (missing or weak requirements)
- "industry": string (classify the hiring firm/role into EXACTLY ONE of: ${JOB_INDUSTRIES.join(
    ", "
  )}. Use "Other" only if none of the financial-services categories clearly apply.)`;
  return claudeJson<JobMatch>(system, user, 1000, model);
}

// ---- Score a raw CV text against a job (used for before/after tailoring) ----
export async function scoreCvTextAgainstJob(
  cvText: string,
  job: { title: string; company?: string | null; description?: string | null },
  model?: string
): Promise<JobMatch> {
  const system =
    "You are an expert career coach scoring how well a CV matches a job. " +
    "Be honest and calibrated. Respond with ONLY a single JSON object.";
  const user = `Score the match between this CV and job from 0-100.

CV:
"""
${cvText.slice(0, 16000)}
"""

JOB:
- Title: ${job.title}
- Company: ${job.company ?? "unknown"}
- Description: ${(job.description ?? "").slice(0, 8000)}

Return a JSON object with exactly these keys:
- "match_score": number 0-100
- "fit_summary": string (2-3 sentences)
- "strengths": string[]
- "gaps": string[]`;
  return claudeJson<JobMatch>(system, user, 1000, model);
}

// ---- CV tailoring: rewrite the candidate's CV for a specific job ----
// Returns STRUCTURED content (rendered into a fixed-layout PDF by the client).
export async function tailorCv(
  profile: CvProfile,
  job: { title: string; company?: string | null; description?: string | null },
  notes?: string,
  model?: string
): Promise<TailoredCv> {
  const system =
    "You are an expert CV writer. You tailor a candidate's REAL CV to a specific " +
    "job to maximise genuine fit. Strict rules: NEVER invent skills, employers, " +
    "dates, qualifications or achievements. Only reframe, reorder, re-emphasise " +
    "and rephrase what the source CV already supports. Mirror the job's language " +
    "where it honestly applies. NEVER use en dashes or em dashes — use a plain " +
    "hyphen '-' everywhere (e.g. '2021 - 2023'). Respond with ONLY a single JSON " +
    "object, no prose, no markdown fences.";

  const prefs = profile.search_preferences;
  const user = `Produce a tailored CV for the target job as a JSON object.

TARGET JOB:
- Title: ${job.title}
- Company: ${job.company ?? "unknown"}
- Description:
"""
${(job.description ?? "").slice(0, 8000)}
"""

SOURCE CV (the only factual basis — do not add anything not supported here):
"""
${(profile.raw_text || profile.summary || "").slice(0, 18000)}
"""

KNOWN FACTS:
- Target roles: ${(prefs?.target_roles ?? []).join(", ")}
${notes ? `\nEMPHASIS NOTES FROM CANDIDATE: ${notes}\n` : ""}
Return JSON with EXACTLY these keys (preserve the candidate's real names, dates and employers):
{
  "name": string,                       // full name
  "contactLine": string,                // e.g. "London, UK | email | phone"
  "summary": string,                    // 4-5 sentence professional summary, tailored to this job
  "capabilities": [                      // "Core capabilities" groups
    { "label": string, "text": string } // label is the category, text is the skills/sentence
  ],
  "education": [
    { "dateRange": string, "institution": string, "location": string, "detail": string }
  ],
  "experience": [                        // reverse chronological
    {
      "dateRange": string,
      "company": string,
      "location": string,
      "title": string,
      "bullets": [ { "text": string, "sub": [string] } ]   // "sub" optional nested points
    }
  ],
  "certifications": string               // single line, optional
}

COMPLETENESS (important):
- Include EVERY role, employer and education entry from the source CV. Do not drop any job or shorten the employment history.
- Preserve the depth: keep a comparable number of bullets per role to the source (reframe and reprioritise them, do NOT summarise multiple points into one or delete detail).
- Keep all quantified achievements (figures, $ amounts, team sizes, percentages) exactly as in the source.
- The result should be similar in length and completeness to the source CV (often two pages) - do NOT compress it to one page.

TAILORING:
- Within each role, order bullets to lead with what matters most for the target job, and rephrase to mirror the job's language where it honestly applies.
- Quantify where the source CV does. Keep everything truthful. Use plain hyphens, never en/em dashes.`;

  const cv = await claudeJson<TailoredCv>(system, user, 8000, model);
  return stripDashes(cv);
}

// ---- Interview prep: generate tailored prep for a specific job ----
export async function generateInterviewPrep(
  profile: CvProfile,
  job: { title: string; company?: string | null; description?: string | null },
  model?: string
): Promise<InterviewPrep> {
  const system =
    "You are an expert interview coach preparing a specific candidate for a " +
    "specific interview. Ground every suggestion in the candidate's REAL " +
    "experience from their CV — never invent achievements. Be concrete and " +
    "practical. NEVER use en dashes or em dashes, only plain hyphens. " +
    "Respond with ONLY a single JSON object, no prose, no markdown fences.";

  const user = `Prepare this candidate for an interview for the job below.

JOB:
- Title: ${job.title}
- Company: ${job.company ?? "unknown"}
- Description:
"""
${(job.description ?? "").slice(0, 8000)}
"""

CANDIDATE CV:
"""
${(profile.raw_text || profile.summary || "").slice(0, 16000)}
"""

Return JSON with EXACTLY these keys:
{
  "role_focus": string,                 // 2-3 sentences on what this role really needs and how the candidate fits
  "questions": [                         // 8-12 likely questions, mixed categories
    {
      "question": string,
      "category": string,                // one of: Behavioural, Technical, Commercial, Motivation, Situational
      "suggested_answer": string         // concrete guidance referencing the candidate's real experience (STAR where useful)
    }
  ],
  "key_stories": [                       // 3-5 of the candidate's strongest real examples to have ready
    { "title": string, "situation": string, "relevance": string }
  ],
  "gaps": [                              // weaknesses vs the role and how to handle them honestly
    { "concern": string, "how_to_address": string }
  ],
  "questions_to_ask": [string]           // 5-7 thoughtful questions for the candidate to ask the interviewer
}

Tailor everything to this specific role and company. Use plain hyphens, never en/em dashes.`;

  const prep = await claudeJson<InterviewPrep>(system, user, 5000, model);
  return stripDashes(prep);
}

// ---- Module 3: Outreach message ----
export async function generateOutreach(
  profile: CvProfile,
  contact: Pick<Contact, "name" | "title" | "company" | "relationship_type">,
  job: Pick<Job, "title" | "company"> | null,
  model?: string
): Promise<string> {
  const system =
    "You write concise, warm, professional networking outreach messages. " +
    "Sound human and specific — never generic or salesy. " +
    "Respond with ONLY the message text, no preamble, no signature placeholders like [Your Name].";
  const user = `Write a short outreach message (max 140 words) from the candidate to a contact.

CONTACT:
- Name: ${contact.name}
- Title: ${contact.title ?? "unknown"}
- Company: ${contact.company ?? "unknown"}
- Relationship: ${contact.relationship_type}

${
  job
    ? `RELATED OPPORTUNITY: ${job.title}${
        job.company ? ` at ${job.company}` : ""
      }`
    : "No specific job linked — this is general networking."
}

CANDIDATE:
- Seniority: ${profile.seniority ?? ""}
- Skills: ${(profile.extracted_skills ?? []).slice(0, 10).join(", ")}
- Summary: ${profile.summary ?? ""}

Reference one specific, relevant piece of the candidate's experience. Match the tone to the relationship (warmer for "warm"/"mutual connection", more introductory for "cold").`;

  const msg = await getClient().messages.create({
    model: model || DEFAULT_MODEL,
    max_tokens: 500,
    system,
    messages: [{ role: "user", content: user }],
  });
  return textOf(msg).trim();
}
