import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase/server";
import { bookSchema } from "@/lib/validations/book";
import { generateEmbedding, buildBookEmbeddingText } from "@/lib/ai/embed";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const service = await createServiceClient();

    const { data: current } = await service
      .from("books")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    if (!current) return NextResponse.json({ message: "Book not found" }, { status: 404 });

    const body = await req.json();
    const data = bookSchema.parse(body);

    if (data.isbn !== current.isbn) {
      const { data: dup } = await service
        .from("books")
        .select("id")
        .eq("isbn", data.isbn)
        .neq("id", params.id)
        .maybeSingle();
      if (dup) return NextResponse.json({ message: "A book with this ISBN already exists" }, { status: 409 });
    }

    const copyDelta = data.total_copies - current.total_copies;
    const availableCopies = Math.max(0, Math.min(data.total_copies, current.available_copies + copyDelta));

    const { data: updated, error } = await service
      .from("books")
      .update({
        title: data.title,
        author: data.author,
        isbn: data.isbn,
        description: data.description,
        genre: data.genre,
        language: data.language,
        cefr_level: data.cefr_level || null,
        cover_url: data.cover_url || null,
        shelf_location: data.shelf_location || null,
        total_copies: data.total_copies,
        available_copies: availableCopies,
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    if (updated) {
      const text = buildBookEmbeddingText(updated);
      generateEmbedding(text)
        .then((embedding) => {
          service
            .from("books")
            .update({ embedding: `[${embedding.join(",")}]` })
            .eq("id", updated.id)
            .then(() => {});
        })
        .catch(() => {});
    }

    return NextResponse.json({ book: updated });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to update book" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const isStaff = profile?.role === "super_admin" || profile?.role === "librarian";
    if (!isStaff) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const service = await createServiceClient();

    const { data: book } = await service
      .from("books")
      .select("id, title")
      .eq("id", params.id)
      .maybeSingle();
    if (!book) return NextResponse.json({ message: "Book not found" }, { status: 404 });

    const { count } = await service
      .from("loans")
      .select("*", { count: "exact", head: true })
      .eq("book_id", book.id)
      .in("status", ["active", "overdue"]);
    if (count && count > 0) {
      return NextResponse.json(
        { message: `Cannot delete "${book.title}": it has ${count} active loan(s). Return them first.` },
        { status: 409 }
      );
    }

    const { error } = await service.from("books").delete().eq("id", book.id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to delete book" }, { status: 500 });
  }
}
