import { NextResponse } from "next/server";
import { updateJob, deleteJob } from "@/lib/jobs";
import { JOB_STATUSES, type JobStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await req.json()) as { status?: string; notes?: string };
    const patch: { status?: JobStatus; notes?: string } = {};
    if (body.status) {
      if (!JOB_STATUSES.includes(body.status as JobStatus)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      patch.status = body.status as JobStatus;
    }
    if (typeof body.notes === "string") patch.notes = body.notes;
    const job = await updateJob(params.id, patch);
    return NextResponse.json({ job });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await deleteJob(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
