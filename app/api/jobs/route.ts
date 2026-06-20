import { NextResponse } from "next/server";
import { listJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const minScoreRaw = searchParams.get("minScore");
    const jobs = await listJobs({
      status: searchParams.get("status") || undefined,
      minScore: minScoreRaw ? Number(minScoreRaw) : undefined,
      q: searchParams.get("q") || undefined,
      location: searchParams.get("location") || undefined,
      industry: searchParams.get("industry") || undefined,
      sort: (searchParams.get("sort") as "score" | "date") || "score",
    });
    return NextResponse.json({ jobs });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
