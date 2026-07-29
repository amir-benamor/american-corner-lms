import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { z } from "zod";
import { semanticSearch } from "@/lib/ai/rag";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: google("gemini-1.5-flash"),
    system: `You are an AI Librarian for American Corner Sousse in Tunisia.
You help members discover books, answer library questions, and make reading recommendations.
You have access to the library catalog via semantic search.
Always be friendly, helpful, and knowledgeable about American literature and culture.
When recommending books, always mention why the book is a good match.
You can communicate in English, French, or Arabic as needed.
The library is located in Sousse, Tunisia and focuses on American culture, English language learning, and educational resources.`,
    messages,
    tools: {
      searchBooks: tool({
        description: "Search for books in the library catalog using semantic search",
        parameters: z.object({
          query: z.string().describe("The search query (title, author, topic, or natural language)"),
          limit: z.number().optional().default(5),
        }),
        execute: async ({ query, limit }) => {
          const results = await semanticSearch(query, limit);
          return results;
        },
      }),
      getBookDetails: tool({
        description: "Get detailed information about a specific book by ID",
        parameters: z.object({
          bookId: z.string().uuid(),
        }),
        execute: async ({ bookId }) => {
          const supabase = await createServiceClient();
          const { data } = await supabase.from("books").select("*").eq("id", bookId).single();
          return data;
        },
      }),
      getLibraryStats: tool({
        description: "Get library statistics",
        parameters: z.object({}),
        execute: async () => {
          const supabase = await createServiceClient();
          const [books, members, activeLoans] = await Promise.all([
            supabase.from("books").select("*", { count: "exact", head: true }),
            supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "member"),
            supabase.from("loans").select("*", { count: "exact", head: true }).in("status", ["active", "overdue"]),
          ]);
          return {
            totalBooks: books.count,
            totalMembers: members.count,
            activeLoans: activeLoans.count,
          };
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
