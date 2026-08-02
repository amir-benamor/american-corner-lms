import { google } from "@ai-sdk/google";
import { embedMany, embed } from "ai";

const embeddingModel = google.textEmbeddingModel("gemini-embedding-001", { outputDimensionality: 512 });

export async function generateEmbedding(text: string) {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });
  return embedding;
}

export async function generateEmbeddings(texts: string[]) {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
  });
  return embeddings;
}

export function buildBookEmbeddingText(book: {
  title: string;
  description?: string | null;
  author: string;
  genre: string;
  tags?: string[] | null;
}) {
  return `${book.title} by ${book.author}. Genre: ${book.genre}. ${
    book.description || ""
  }. Tags: ${(book.tags || []).join(", ")}`.trim();
}
