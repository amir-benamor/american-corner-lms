import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateEmbeddings, buildBookEmbeddingText } from "@/lib/ai/embed";

export const maxDuration = 60;

export async function POST() {
  try {
    const supabase = await createServiceClient();
    const { data: books, error } = await supabase
      .from("books")
      .select("id, title, author, description, genre, tags, embedding")
      .is("embedding", null);

    if (error) throw new Error(error.message);

    if (!books || books.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, message: "No books missing embeddings" });
    }

    const texts = books.map((b: any) => buildBookEmbeddingText(b));
    const { embeddings } = await generateEmbeddings(texts);

    let updated = 0;
    for (let i = 0; i < books.length; i++) {
      const { error: updError } = await supabase
        .from("books")
        .update({ embedding: `[${embeddings[i].join(",")}]` })
        .eq("id", books[i].id);
      if (!updError) updated++;
    }

    return NextResponse.json({ ok: true, processed: updated });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Re-embed failed" }, { status: 500 });
  }
}
