import { createServerSupabaseClient } from "../supabase/server";
import { generateEmbedding } from "./embed";

export async function semanticSearch(query: string, limit = 10) {
  const embedding = await generateEmbedding(query);
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("search_books", {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: limit,
  });

  if (error) throw error;
  return data as Array<{
    id: string;
    title: string;
    author: string;
    isbn: string;
    description: string;
    genre: string;
    language: string;
    cefr_level: string | null;
    cover_url: string | null;
    available_copies: number;
    similarity: number;
  }>;
}

export async function getRecommendations(
  likedBookId: string,
  limit = 5
) {
  const supabase = await createServerSupabaseClient();
  const { data: book } = await supabase
    .from("books")
    .select("id, title, description, author, genre, tags, embedding")
    .eq("id", likedBookId)
    .single();

  if (!book || !book.embedding) return [];

  const { data } = await supabase.rpc("search_books", {
    query_embedding: book.embedding,
    match_threshold: 0.6,
    match_count: limit + 1,
  });

  return ((data as any[]) || [])
    .filter((b: any) => b.id !== likedBookId)
    .slice(0, limit);
}

export async function generateBookTags(title: string, description: string) {
  const text = `${title}: ${description}`;
  const embedding = await generateEmbedding(text);
  return embedding;
}
