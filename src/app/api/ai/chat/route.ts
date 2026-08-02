import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { NextResponse } from "next/server";
import { semanticSearch } from "@/lib/ai/rag";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const lastUserMessage = [...messages]
      .reverse()
      .find((m: any) => m.role === "user");

    let catalogResults = "";
    if (lastUserMessage?.content) {
      try {
        const results = await semanticSearch(lastUserMessage.content, 5);
        catalogResults = results.length
          ? results
              .map(
                (b) =>
                  `- "${b.title}" by ${b.author} (${b.genre}, ${b.language}, CEFR ${
                    b.cefr_level || "N/A"
                  }, ${b.available_copies} copy available) - ${b.description}`
              )
              .join("\n")
          : "No matching books found in the catalog.";
      } catch {
        catalogResults = "Catalog search is currently unavailable.";
      }
    }

    const result = await streamText({
      model: google("gemini-3.5-flash"),
      system: `You are an AI Librarian for American Corner Sousse in Tunisia.
You help members discover books, answer library questions, and make reading recommendations.
Always be friendly, helpful, and knowledgeable about American literature and culture.
When recommending books, always mention why the book is a good match.
You can communicate in English, French, or Arabic as needed.
The library is located in Sousse, Tunisia and focuses on American culture, English language learning, and educational resources.

Books from the library catalog relevant to the user's latest question:
${catalogResults}

Use the list above when recommending or discussing books. If the user is not asking about books, you may answer generally and mention the catalog list only if relevant. If no books match, say so and suggest browsing the catalog or trying a different topic.`,
      messages,
    });

    return result.toDataStreamResponse();
  } catch (err: any) {
    return NextResponse.json(
      { message: err.message || "AI Assistant error" },
      { status: 500 }
    );
  }
}
