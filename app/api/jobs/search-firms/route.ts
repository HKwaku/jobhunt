import { NextResponse } from "next/server";
import { runFirmWatchlistSearch } from "@/lib/search";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Search the real-estate investment-manager watchlist by firm name across
// keyword sources, keeping only technology/transformation-style roles.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      location?: string;
      limit?: number;
    };
    const result = await runFirmWatchlistSearch(body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
