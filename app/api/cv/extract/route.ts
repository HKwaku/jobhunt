import { NextResponse } from "next/server";
import { extractCvProfile, isAnthropicConfigured } from "@/lib/anthropic";
import { upsertProfile, getProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST { text } -> runs Claude extraction, stores raw_text + extracted fields.
export async function POST(req: Request) {
  try {
    const { text } = (await req.json()) as { text?: string };
    if (!text || text.trim().length < 30) {
      return NextResponse.json(
        { error: "Please provide CV text (at least a few sentences)." },
        { status: 400 }
      );
    }

    if (!isAnthropicConfigured()) {
      // Graceful fallback: store the raw text even if extraction is unavailable.
      const profile = await upsertProfile({ raw_text: text });
      return NextResponse.json({
        profile,
        warning:
          "ANTHROPIC_API_KEY is not set — CV text saved, but skills/summary were not extracted.",
      });
    }

    try {
      const existing = await getProfile();
      const extracted = await extractCvProfile(
        text,
        existing?.model ?? undefined
      );
      const profile = await upsertProfile({
        raw_text: text,
        extracted_skills: extracted.extracted_skills ?? [],
        extracted_industries: extracted.extracted_industries ?? [],
        seniority: extracted.seniority ?? null,
        years_experience: extracted.years_experience ?? null,
        notable_employers: extracted.notable_employers ?? [],
        summary: extracted.summary ?? null,
      });
      return NextResponse.json({ profile });
    } catch (err) {
      // Claude failed — still persist the raw text so nothing is lost.
      const profile = await upsertProfile({ raw_text: text });
      return NextResponse.json({
        profile,
        warning: `CV text saved, but Claude extraction failed: ${
          (err as Error).message
        }`,
      });
    }
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
