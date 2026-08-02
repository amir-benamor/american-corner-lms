"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BookForm, BookFormValues } from "@/components/books/book-form";
import { createClient } from "@/lib/supabase/client";

export default function EditBookPage() {
  const router = useRouter();
  const params = useParams();
  const [initial, setInitial] = useState<BookFormValues | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const isStaff = p?.role === "super_admin" || p?.role === "librarian";
      if (!isStaff) { router.push("/dashboard/books"); return; }
      const { data } = await supabase.from("books").select("*").eq("id", params.id).maybeSingle();
      if (!data) { router.push("/dashboard/books"); return; }
      setInitial({
        title: data.title,
        author: data.author,
        isbn: data.isbn,
        description: data.description || "",
        genre: data.genre,
        language: data.language,
        cefr_level: data.cefr_level || "",
        cover_url: data.cover_url || "",
        shelf_location: data.shelf_location || "",
        total_copies: data.total_copies,
      });
      setLoading(false);
    });
  }, [params.id, router]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!initial) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Book</h1>
        <p className="text-muted-foreground">Update book details in the catalog</p>
      </div>
      <BookForm mode="edit" bookId={params.id as string} initial={initial} />
    </div>
  );
}
