import { getBooks } from "@/lib/supabase/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, BookOpen } from "lucide-react";
import Link from "next/link";
import { getCurrentUser, getProfile } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; genre?: string; language?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getProfile(user.id);
  if (!profile) redirect("/login");

  const params = await searchParams;
  const { books, count } = await getBooks({
    search: params.search,
    genre: params.genre,
    language: params.language,
    limit: 30,
  });

  const isStaff = profile.role === "super_admin" || profile.role === "librarian";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Book Catalog</h1>
          <p className="text-muted-foreground">{count ?? 0} books in the library</p>
        </div>
        {isStaff && (
          <Link href="/dashboard/books/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Book
            </Button>
          </Link>
        )}
      </div>

      <form className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input name="search" placeholder="Search by title, author, or ISBN..." className="pl-10" defaultValue={params.search} />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {books?.map((book) => (
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

      {!books?.length && (
        <div className="text-center py-12 text-muted-foreground">
          {params.search ? "No books found matching your search." : "No books in the catalog yet."}
        </div>
      )}
    </div>
  );
}
