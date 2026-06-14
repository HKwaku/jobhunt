import { NextResponse } from "next/server";
import { getJob, updateJobInterviewPrep } from "@/lib/jobs";
import { getProfile } from "@/lib/profile";
import { generateInterviewPrep, isAnthropicConfigured } from "@/lib/anthropic";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// POST -> generate interview prep for this job, grounded in the CV profile.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!isAnthropicConfigured()) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not set — cannot generate prep." },
        { status: 400 }
      );
    }

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

    const prep = await generateInterviewPrep(
      profile,
      {
        title: job.title,
        company: job.company,
        description: job.description,
      },
      profile.model ?? undefined
    );

    const updated = await updateJobInterviewPrep(
      params.id,
      JSON.stringify(prep)
    );

    return NextResponse.json({
      interview_prep: prep,
      interview_prep_at: updated.interview_prep_at,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Interview prep failed: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}
