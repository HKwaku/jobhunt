import { NextResponse } from "next/server";
import { getJob, updateJobTailored } from "@/lib/jobs";
import { getProfile, upsertProfile } from "@/lib/profile";
import {
  tailorCv,
  scoreCvTextAgainstJob,
  isAnthropicConfigured,
} from "@/lib/anthropic";
import { cvToPlainText } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// POST { format?: string } -> tailor the CV to this job, score before/after.
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!isAnthropicConfigured()) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not set — cannot tailor a CV." },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as { notes?: string };

    const [job, profile] = await Promise.all([getJob(params.id), getProfile()]);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (!profile || !(profile.raw_text || profile.summary)) {
      return NextResponse.json(
        { error: "Add and extract your CV first (CV Profile)." },
        { status: 400 }
      );
    }

    // Optional emphasis notes: explicit > saved profile notes.
    const notes = body.notes?.trim() || profile.cv_format || "";

    // Persist supplied notes as the reusable default.
    if (body.notes?.trim() && body.notes.trim() !== profile.cv_format) {
      await upsertProfile({ cv_format: body.notes.trim() });
    }

    const jobLite = {
      title: job.title,
      company: job.company,
      description: job.description,
    };

    const model = profile.model ?? undefined;

    // Generate the structured tailored CV.
    const tailored = await tailorCv(profile, jobLite, notes, model);
    const tailoredText = cvToPlainText(tailored);

    // Measure improvement: score original CV text vs tailored CV text the same way.
    const originalText = profile.raw_text || profile.summary || "";
    const [beforeRes, afterRes] = await Promise.allSettled([
      scoreCvTextAgainstJob(originalText, jobLite, model),
      scoreCvTextAgainstJob(tailoredText, jobLite, model),
    ]);

    const before =
      beforeRes.status === "fulfilled" ? beforeRes.value : null;
    const after = afterRes.status === "fulfilled" ? afterRes.value : null;

    const updated = await updateJobTailored(params.id, {
      tailored_cv: JSON.stringify(tailored),
      tailored_score: after ? Math.round(after.match_score) : null,
    });

    return NextResponse.json({
      tailored_cv: tailored,
      before_score: before ? Math.round(before.match_score) : null,
      after_score: after ? Math.round(after.match_score) : null,
      after_summary: after?.fit_summary ?? null,
      tailored_at: updated.tailored_at,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Tailoring failed: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}
