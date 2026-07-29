import { getBookById } from "@/lib/supabase/queries";
import { getCurrentUser, getProfile } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getProfile(user.id);
  const { id } = await params;
  const book = await getBookById(id);
  if (!book) return <div className="text-center py-12">Book not found</div>;

  const isStaff = profile?.role === "super_admin" || profile?.role === "librarian";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/dashboard/books" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to catalog
      </Link>

      <Card>
        <CardContent className="p-6">
          <div className="flex gap-6 flex-col sm:flex-row">
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} className="h-64 w-44 object-cover rounded-lg flex-shrink-0" />
            ) : (
              <div className="h-64 w-44 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <div className="space-y-3 flex-1">
              <div>
                <h1 className="text-2xl font-bold">{book.title}</h1>
                <p className="text-muted-foreground">{book.author}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge>{book.genre}</Badge>
                <Badge variant="secondary">{book.language}</Badge>
                {book.cefr_level && <Badge variant="outline">CEFR: {book.cefr_level}</Badge>}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">ISBN:</span> {book.isbn}
                </div>
                <div>
                  <span className="text-muted-foreground">Barcode:</span> {book.barcode}
                </div>
                <div>
                  <span className="text-muted-foreground">Shelf:</span> {book.shelf_location || "Unassigned"}
                </div>
                <div>
                  <span className="text-muted-foreground">Copies:</span> {book.available_copies}/{book.total_copies} available
                </div>
              </div>

              {book.description && (
                <p className="text-sm text-muted-foreground">{book.description}</p>
              )}

              {isStaff && (
                <div className="flex gap-2 pt-2">
                  <Link href={`/dashboard/books/${id}/edit`}>
                    <Button variant="outline" size="sm">Edit Book</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
