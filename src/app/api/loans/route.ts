import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase/server";

const LOAN_DURATION_DAYS = 14;
const MAX_ACTIVE_LOANS = 5;

export async function POST(req: Request) {
  try {
    const { action, user_barcode, book_barcode } = await req.json();
    const supabase = await createServerSupabaseClient();
    const serviceClient = await createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const isStaff = profile?.role === "super_admin" || profile?.role === "librarian";
    if (!isStaff) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    if (action === "checkout") {
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("membership_barcode", user_barcode)
        .single();
      if (!profile) return NextResponse.json({ message: "Member not found" }, { status: 404 });

      const { data: book } = await serviceClient
        .from("books")
        .select("id, available_copies")
        .eq("barcode", book_barcode)
        .single();
      if (!book) return NextResponse.json({ message: "Book not found" }, { status: 404 });
      if (book.available_copies < 1) return NextResponse.json({ message: "No copies available" }, { status: 400 });

      const { count } = await serviceClient
        .from("loans")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .in("status", ["active", "overdue"]);
      if (count && count >= MAX_ACTIVE_LOANS) {
        return NextResponse.json({ message: "Member has reached maximum loan limit" }, { status: 400 });
      }

      const dueAt = new Date(Date.now() + LOAN_DURATION_DAYS * 24 * 60 * 60 * 1000);

      const { error: loanError } = await serviceClient.from("loans").insert({
        user_id: profile.id,
        book_id: book.id,
        due_at: dueAt.toISOString(),
        status: "active",
      });
      if (loanError) throw loanError;

      await serviceClient
        .from("books")
        .update({ available_copies: book.available_copies - 1 })
        .eq("id", book.id);

      return NextResponse.json({ success: true, dueAt: dueAt.toISOString() });
    }

    if (action === "return") {
      const { data: book } = await serviceClient
        .from("books")
        .select("id, available_copies, total_copies")
        .eq("barcode", book_barcode)
        .single();
      if (!book) return NextResponse.json({ message: "Book not found" }, { status: 404 });

      const { data: loan } = await serviceClient
        .from("loans")
        .select("id")
        .eq("book_id", book.id)
        .in("status", ["active", "overdue"])
        .order("borrowed_at", { ascending: false })
        .limit(1)
        .single();
      if (!loan) return NextResponse.json({ message: "No active loan for this book" }, { status: 400 });

      await serviceClient
        .from("loans")
        .update({ returned_at: new Date().toISOString(), status: "returned" })
        .eq("id", loan.id);

      await serviceClient
        .from("books")
        .update({ available_copies: Math.min(book.available_copies + 1, book.total_copies) })
        .eq("id", book.id);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
