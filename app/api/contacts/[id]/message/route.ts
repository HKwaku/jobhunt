import { NextResponse } from "next/server";
import { getContact, updateContact } from "@/lib/contacts";
import { getProfile } from "@/lib/profile";
import { normalizeJob } from "@/lib/jobs";
import { getSupabase } from "@/lib/supabase";
import { generateOutreach, isAnthropicConfigured } from "@/lib/anthropic";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST -> generate a personalised outreach message and save it on the contact.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!isAnthropicConfigured()) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not set — cannot generate messages." },
        { status: 400 }
      );
    }

    const contact = await getContact(params.id);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json(
        { error: "Create your CV profile first — it personalises the message." },
        { status: 400 }
      );
    }

    let job: Job | null = null;
    if (contact.linked_job_id) {
      const { data } = await getSupabase()
        .from("jobs")
        .select("*")
        .eq("id", contact.linked_job_id)
        .maybeSingle();
      if (data) job = normalizeJob(data);
    }

    const message = await generateOutreach(
      profile,
      contact,
      job,
      profile.model ?? undefined
    );
    const updated = await updateContact(params.id, {
      generated_message: message,
    });
    return NextResponse.json({ contact: updated });
  } catch (e) {
    return NextResponse.json(
      { error: `Generation failed: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}
