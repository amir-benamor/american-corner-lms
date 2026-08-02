"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Search } from "lucide-react";

export interface BookFormValues {
  title: string;
  author: string;
  isbn: string;
  description?: string;
  genre: string;
  language: string;
  cefr_level?: string;
  cover_url?: string;
  shelf_location?: string;
  total_copies: number;
}

interface BookFormProps {
  mode: "create" | "edit";
  bookId?: string;
  initial?: BookFormValues | null;
}

export function BookForm({ mode, bookId, initial }: BookFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isbnLoading, setIsbnLoading] = useState(false);
  const [error, setError] = useState("");
  const [isbnInput, setIsbnInput] = useState(initial?.isbn || "");
  const [previewCover, setPreviewCover] = useState(initial?.cover_url || "");

  async function lookupISBN() {
    if (!isbnInput.match(/^(?:\d{10}|\d{13})$/)) {
      setError("Invalid ISBN format");
      return;
    }
    setIsbnLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/isbn?isbn=${isbnInput}`);
      const data = await res.json();
      if (!data) {
        setError("Book not found via ISBN");
        return;
      }
      if (data.cover_url) setPreviewCover(data.cover_url);
      const form = document.getElementById("book-form") as HTMLFormElement;
      if (form) {
        (form.elements.namedItem("title") as HTMLInputElement).value = data.title || "";
        (form.elements.namedItem("author") as HTMLInputElement).value = data.author || "";
        (form.elements.namedItem("description") as HTMLTextAreaElement).value = data.description || "";
        (form.elements.namedItem("genre") as HTMLInputElement).value = data.genre || "";
        (form.elements.namedItem("language") as HTMLSelectElement).value = data.language || "english";
        if (data.cover_url) {
          (form.elements.namedItem("cover_url") as HTMLInputElement).value = data.cover_url;
        }
      }
    } catch {
      setError("Failed to lookup ISBN");
    } finally {
      setIsbnLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const body = new URLSearchParams(new FormData(e.currentTarget) as any);
      const payload = Object.fromEntries(body.entries());

      const url = mode === "edit" ? `/api/books/${bookId}` : "/api/books";
      const res = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          total_copies: Number(payload.total_copies),
        }),
      });

      if (!res.ok) {
        const { message } = await res.json();
        throw new Error(message || "Failed to save book");
      }

      router.push("/dashboard/books");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {mode === "create" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">ISBN Auto-Lookup</CardTitle>
            <CardDescription>Search by ISBN to auto-populate book details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter ISBN (10 or 13 digits)"
                value={isbnInput}
                onChange={(e) => setIsbnInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), lookupISBN())}
              />
              <Button variant="secondary" onClick={lookupISBN} disabled={isbnLoading}>
                {isbnLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Lookup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <form id="book-form" onSubmit={handleSubmit} className="space-y-4">
        {previewCover && (
          <div className="flex justify-center">
            <img src={previewCover} alt="Cover preview" className="h-40 object-contain rounded border" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2">
            <Label htmlFor="title">Title *</Label>
            <Input name="title" id="title" required defaultValue={initial?.title} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="author">Author *</Label>
            <Input name="author" id="author" required defaultValue={initial?.author} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="isbn">ISBN *</Label>
            <Input name="isbn" id="isbn" placeholder="10 or 13 digits" required defaultValue={initial?.isbn} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="genre">Genre *</Label>
            <Input name="genre" id="genre" list="genres" required defaultValue={initial?.genre} />
            <datalist id="genres">
              {["Fiction", "Non-Fiction", "History", "Science", "Technology", "Literature", "Biography", "Education", "US Studies", "English Learning"].map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <select name="language" id="language" defaultValue={initial?.language || "english"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="english">English</option>
              <option value="french">French</option>
              <option value="arabic">Arabic</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cefr_level">CEFR Level</Label>
            <select name="cefr_level" id="cefr_level" defaultValue={initial?.cefr_level || ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">None</option>
              <option value="A1">A1 - Beginner</option>
              <option value="A2">A2 - Elementary</option>
              <option value="B1">B1 - Intermediate</option>
              <option value="B2">B2 - Upper Intermediate</option>
              <option value="C1">C1 - Advanced</option>
              <option value="C2">C2 - Proficient</option>
            </select>
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="description">Description</Label>
            <textarea name="description" id="description" rows={3} defaultValue={initial?.description} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover_url">Cover Image URL</Label>
            <Input name="cover_url" id="cover_url" placeholder="https://..." defaultValue={initial?.cover_url} onChange={(e) => setPreviewCover(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shelf_location">Shelf Location</Label>
            <Input name="shelf_location" id="shelf_location" placeholder="e.g. A-12" defaultValue={initial?.shelf_location} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="total_copies">Total Copies *</Label>
            <Input name="total_copies" id="total_copies" type="number" min={1} defaultValue={initial?.total_copies ?? 1} required />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {mode === "edit" ? "Save Changes" : "Add Book"}
          </Button>
          <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
