import { createServerSupabaseClient } from "@/lib/supabase/server";
import { bookSchema } from "@/lib/validations/book";
import { NextResponse } from "next/server";
import { generateEmbedding, buildBookEmbeddingText } from "@/lib/ai/embed";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const formData = await req.formData();
    const raw = Object.fromEntries(formData);
    const data = bookSchema.parse(raw);

    const barcode = `BOOK-${data.isbn}-${Date.now().toString(36).toUpperCase()}`;

    const { data: book, error } = await supabase
      .from("books")
      .insert({
        ...data,
        cefr_level: data.cefr_level || null,
        cover_url: data.cover_url || null,
        shelf_location: data.shelf_location || null,
        available_copies: data.total_copies,
        barcode,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Generate embedding in background
    if (book) {
      const text = buildBookEmbeddingText(book);
      generateEmbedding(text)
        .then((embedding) => {
          supabase
            .from("books")
            .update({ embedding: `[${embedding.join(",")}]` })
            .eq("id", book.id)
            .then(() => {});
        })
        .catch(() => {});
    }

    return NextResponse.json({ barcode, book });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 400 });
  }
}
