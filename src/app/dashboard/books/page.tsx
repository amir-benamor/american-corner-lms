"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function BooksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [books, setBooks] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [search, setSearch] = useState(searchParams.get("search") || "");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setProfile(p);
      await loadBooks(supabase);
    });
  }, []);

  async function loadBooks(supabase: any, q?: string) {
    setLoading(true);
    let query = supabase.from("books").select("*", { count: "exact" });
    if (q || search) {
      const s = q || search;
      query = query.or(`title.ilike.%${s}%,author.ilike.%${s}%,isbn.ilike.%${s}%`);
    }
    const { data, count } = await query.order("title", { ascending: true });
    setBooks(data || []);
    setCount(count || 0);
    setLoading(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadBooks(createClient(), search);
  }

  const isStaff = profile?.role === "super_admin" || profile?.role === "librarian";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Book Catalog</h1>
          <p className="text-muted-foreground">{count} books</p>
        </div>
        {isStaff && (
          <Link href="/dashboard/books/new">
            <Button><Plus className="h-4 w-4 mr-2" />Add Book</Button>
          </Link>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, author, or ISBN..." className="pl-10" />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <Link key={book.id} href={`/dashboard/books/${book.id}`}>
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="h-28 w-20 object-cover rounded flex-shrink-0" />
                    ) : (
                      <div className="h-28 w-20 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{book.title}</h3>
                      <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="secondary" className="text-xs">{book.genre}</Badge>
                        <Badge variant="outline" className="text-xs">{book.language}</Badge>
                        {book.cefr_level && <Badge variant="outline" className="text-xs">{book.cefr_level}</Badge>}
                      </div>
                      <p className="text-xs mt-2">
                        <span className={book.available_copies > 0 ? "text-green-600" : "text-red-600"}>
                          {book.available_copies}/{book.total_copies}
                        </span> available
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
