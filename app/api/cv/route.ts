import { NextResponse } from "next/server";
import { getProfile, upsertProfile, DEFAULT_PREFERENCES } from "@/lib/profile";
import type { SearchPreferences } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET current CV profile
export async function GET() {
  try {
    const profile = await getProfile();
    return NextResponse.json({ profile });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

// PUT — update raw_text and/or search_preferences
export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as {
      raw_text?: string;
      search_preferences?: Partial<SearchPreferences>;
      cv_format?: string;
      model?: string;
    };
    const patch: Record<string, unknown> = {};
    if (typeof body.raw_text === "string") patch.raw_text = body.raw_text;
    if (typeof body.cv_format === "string") patch.cv_format = body.cv_format;
    if (typeof body.model === "string") patch.model = body.model;
    if (body.search_preferences) {
      patch.search_preferences = {
        ...DEFAULT_PREFERENCES,
        ...body.search_preferences,
      };
    }
    const profile = await upsertProfile(patch);
    return NextResponse.json({ profile });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
