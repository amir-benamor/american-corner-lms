"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bot, User, Send, Loader2, Sparkles, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm the AI Librarian at American Corner Sousse. I can help you discover books, get recommendations, and learn about the library. Try asking me:\n\n- \"Find me a good mystery book\"\n- \"What are some books for B1 English learners?\"\n- \"Recommend books like The Great Gatsby\"\n- \"Show me books about American history\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const suggestions = [
    "Find me books about US history",
    "I want to learn English, what should I read?",
    "Show me available science fiction books",
    "Recommend books for C1 level",
  ];

  async function handleSend(text?: string) {
    const content = text || input;
    if (!content.trim() || loading) return;

    setShowSuggestions(false);
    const userMsg: Message = { role: "user", content: content.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) {
        let detail = "";
        try {
          const err = await res.json();
          detail = err.message || "";
        } catch {}
        throw new Error(detail || `Request failed with status ${res.status}`);
      }

      if (!res.body) throw new Error("No response");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("0:")) {
            try {
              const content = JSON.parse(line.slice(2));
              fullContent += content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: fullContent };
                return updated;
              });
            } catch {}
          }
        }
      }

      if (!fullContent.trim()) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "I couldn't find a clear answer for that. Try rephrasing your question, or ask about a specific book, author, or topic.",
          };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Librarian Assistant</h1>
          <p className="text-muted-foreground">Powered by semantic search and GPT-4o</p>
        </div>
      </div>

      <Card className="h-[600px] flex flex-col">
        <CardHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">American Corner Catalog Search</span>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[75%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap",
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}

          {showSuggestions && (
            <div className="space-y-2 pt-4">
              <p className="text-xs text-muted-foreground text-center">Try asking:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-1.5 rounded-full transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>
        <div className="p-4 border-t flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask the AI Librarian..."
            className="flex-1"
          />
          <Button onClick={() => handleSend()} disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}
