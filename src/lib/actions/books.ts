"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, createServiceClient } from "../supabase/server";
import { bookSchema } from "../validations/book";
import { generateEmbedding, buildBookEmbeddingText } from "../ai/embed";

export async function createBook(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const data = bookSchema.parse(Object.fromEntries(formData));

  const barcode = `BOOK-${data.isbn}-${Date.now().toString(36).toUpperCase()}`;

  const { error } = await supabase.from("books").insert({
    ...data,
    cefr_level: data.cefr_level || null,
    cover_url: data.cover_url || null,
    shelf_location: data.shelf_location || null,
    available_copies: data.total_copies,
    barcode,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/books");
  return { barcode };
}

export async function updateBook(id: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const raw = Object.fromEntries(formData);
  const data = bookSchema.parse(raw);

  const { error } = await supabase
    .from("books")
    .update({
      ...data,
      cefr_level: data.cefr_level || null,
      cover_url: data.cover_url || null,
      shelf_location: data.shelf_location || null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  void generateAndStoreEmbedding(id);

  revalidatePath(`/dashboard/books/${id}`);
  revalidatePath("/dashboard/books");
}

export async function deleteBook(id: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("books").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/books");
}

export async function lookupISBN(isbn: string) {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&country=US`
    );
    const json = await res.json();
    if (!json.items?.length) {
      const res2 = await fetch(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
      );
      const json2 = await res2.json();
      const book = json2[`ISBN:${isbn}`];
      if (!book) return null;
      return {
        title: book.title,
        author: book.authors?.map((a: any) => a.name).join(", ") || "Unknown",
        description: book.subtitle || "",
        cover_url: book.cover?.large || book.cover?.medium || "",
        genre: book.subjects?.[0]?.name || "",
        language: "english",
      };
    }
    const item = json.items[0];
    const info = item.volumeInfo;
    return {
      title: info.title,
      author: info.authors?.join(", ") || "Unknown",
      description: info.description || "",
      cover_url: info.imageLinks?.thumbnail?.replace("http:", "https:").replace("&zoom=1", "&zoom=2") || "",
      genre: info.categories?.[0] || "",
      language: info.language === "fr" ? "french" : info.language === "ar" ? "arabic" : "english",
    };
  } catch {
    return null;
  }
}

async function generateAndStoreBookEmbedding(bookId: string) {
  try {
    const serviceClient = await createServiceClient();
    const { data: book } = await serviceClient
      .from("books")
      .select("id, title, description, author, genre, tags")
      .eq("id", bookId)
      .single();
    if (!book) return;
    const text = buildBookEmbeddingText(book);
    const embedding = await generateEmbedding(text);
    await serviceClient
      .from("books")
      .update({ embedding: `[${embedding.join(",")}]` })
      .eq("id", bookId);
  } catch {
    // silently fail
  }
}

async function generateAndStoreEmbedding(bookId: string) {
  void generateAndStoreBookEmbedding(bookId);
}
