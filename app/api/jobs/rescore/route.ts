import { NextResponse } from "next/server";
import { rescoreJobs } from "@/lib/search";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST { ids?: string[] } -> re-score existing jobs against the current CV.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { ids?: string[] };
    const result = await rescoreJobs(body?.ids);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
