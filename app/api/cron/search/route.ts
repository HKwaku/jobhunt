import { NextResponse } from "next/server";
import { runJobSearch } from "@/lib/search";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Daily scheduled search. Wire this to a scheduler (e.g. Vercel Cron — see
// vercel.json). Protect with CRON_SECRET if set: send
//   Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    // Uses saved CV search preferences (no explicit keywords).
    const result = await runJobSearch({});
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
