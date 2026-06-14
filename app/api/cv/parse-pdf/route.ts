import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST multipart/form-data with field "file" (a PDF) -> { text }
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No PDF file uploaded (field 'file')." },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());

    // pdf-parse 2.x: construct with the buffer, then extract text.
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buf });
    let text = "";
    try {
      const result = await parser.getText();
      // pdf-parse 2.x injects "-- N of M --" page separators; drop them.
      text = (result.text || "")
        .replace(/\n*-- \d+ of \d+ --\n*/g, "\n")
        .trim();
    } finally {
      await parser.destroy();
    }

    if (!text) {
      return NextResponse.json(
        {
          error:
            "Couldn't extract text from this PDF (it may be scanned/image-only). Try pasting the text instead.",
        },
        { status: 422 }
      );
    }
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to read PDF: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}
