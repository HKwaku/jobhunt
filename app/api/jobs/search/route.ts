import { NextResponse } from "next/server";
import { runJobSearch } from "@/lib/search";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      keywords?: string;
      location?: string;
      limit?: number;
    };
    const result = await runJobSearch(body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
