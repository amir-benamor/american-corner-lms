import { getBooks } from "@/lib/supabase/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function PublicCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; genre?: string }>;
}) {
  const params = await searchParams;
  const { books, count } = await getBooks({
    search: params.search,
    genre: params.genre,
    limit: 30,
  });

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-bold">American Corner Sousse</span>
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Sign In
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Library Catalog</h1>
          <p className="text-muted-foreground">Browse our collection of {count ?? 0} books</p>
        </div>

        <form className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input name="search" placeholder="Search books..." className="pl-10" defaultValue={params.search} />
          </div>
          <Button type="submit">Search</Button>
        </form>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {books?.map((book) => (
            <Card key={book.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="h-24 w-16 object-cover rounded flex-shrink-0" />
                  ) : (
                    <div className="h-24 w-16 bg-muted rounded flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{book.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="secondary" className="text-xs">{book.genre}</Badge>
                      {book.cefr_level && <Badge variant="outline" className="text-xs">{book.cefr_level}</Badge>}
                    </div>
                    <p className="text-xs mt-2">
                      {book.available_copies > 0 ? (
                        <span className="text-green-600">{book.available_copies} available</span>
                      ) : (
                        <span className="text-red-600">Checked out</span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
