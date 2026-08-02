"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function BookDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [book, setBook] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setProfile(p);
      const { data } = await supabase.from("books").select("*").eq("id", params.id).maybeSingle();
      if (!data) { router.push("/dashboard/books"); return; }
      setBook(data);
      setLoading(false);
    });
  }, [params.id, router]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!book) return null;

  const isStaff = profile?.role === "super_admin" || profile?.role === "librarian";

  async function handleDelete() {
    if (!book) return;
    if (!window.confirm(`Delete "${book.title}" from the catalog? This cannot be undone.`)) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
      if (!res.ok) {
        const { message } = await res.json();
        throw new Error(message || "Failed to delete book");
      }
      router.push("/dashboard/books");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setDeleting(false);
    }
  }

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
                <div><span className="text-muted-foreground">ISBN:</span> {book.isbn}</div>
                <div><span className="text-muted-foreground">Barcode:</span> {book.barcode}</div>
                <div><span className="text-muted-foreground">Shelf:</span> {book.shelf_location || "Unassigned"}</div>
                <div><span className="text-muted-foreground">Copies:</span> {book.available_copies}/{book.total_copies} available</div>
              </div>
              {book.description && <p className="text-sm text-muted-foreground">{book.description}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
      {isStaff && (
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/books/${book.id}/edit`}>
            <Button variant="outline"><Pencil className="h-4 w-4 mr-2" />Edit Book</Button>
          </Link>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Delete Book
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
