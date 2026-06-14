import { NextResponse } from "next/server";
import { listContacts, createContact } from "@/lib/contacts";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contacts = await listContacts({
      status: searchParams.get("status") || undefined,
      company: searchParams.get("company") || undefined,
      relationship_type: searchParams.get("relationship_type") || undefined,
    });
    return NextResponse.json({ contacts });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const contact = await createContact(body);
    return NextResponse.json({ contact });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
