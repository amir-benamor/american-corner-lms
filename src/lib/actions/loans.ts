"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, createServiceClient } from "../supabase/server";

const LOAN_DURATION_DAYS = 14;
const MAX_ACTIVE_LOANS = 5;
const RENEWAL_LIMIT = 2;

export async function checkoutBook(userBarcode: string, bookBarcode: string) {
  const supabase = await createServerSupabaseClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("membership_barcode", userBarcode)
    .single();

  if (!profile) throw new Error("Member not found");

  const { data: book } = await supabase
    .from("books")
    .select("id, available_copies")
    .eq("barcode", bookBarcode)
    .single();

  if (!book) throw new Error("Book not found");
  if (book.available_copies < 1) throw new Error("No copies available");

  const { count: activeCount } = await supabase
    .from("loans")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .in("status", ["active", "overdue"]);

  if (activeCount && activeCount >= MAX_ACTIVE_LOANS) {
    throw new Error(`Member already has ${MAX_ACTIVE_LOANS} active loans`);
  }

  const now = new Date();
  const dueAt = new Date(now.getTime() + LOAN_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const { error: loanError } = await supabase.from("loans").insert({
    user_id: profile.id,
    book_id: book.id,
    borrowed_at: now.toISOString(),
    due_at: dueAt.toISOString(),
    status: "active",
  });

  if (loanError) throw new Error(loanError.message);

  const { error: updateError } = await supabase
    .from("books")
    .update({ available_copies: book.available_copies - 1 })
    .eq("id", book.id);

  if (updateError) throw new Error(updateError.message);

  revalidatePath("/dashboard/loans");
  return { success: true, dueAt: dueAt.toISOString() };
}

export async function returnBook(bookBarcode: string) {
  const supabase = await createServerSupabaseClient();

  const { data: book } = await supabase
    .from("books")
    .select("id, available_copies, total_copies")
    .eq("barcode", bookBarcode)
    .single();

  if (!book) throw new Error("Book not found");

  const { data: loan } = await supabase
    .from("loans")
    .select("id, status")
    .eq("book_id", book.id)
    .in("status", ["active", "overdue"])
    .order("borrowed_at", { ascending: false })
    .limit(1)
    .single();

  if (!loan) throw new Error("No active loan found for this book");

  if (book.available_copies >= book.total_copies) {
    throw new Error("All copies are already available");
  }

  const { error: loanError } = await supabase
    .from("loans")
    .update({
      returned_at: new Date().toISOString(),
      status: "returned",
    })
    .eq("id", loan.id);

  if (loanError) throw new Error(loanError.message);

  const { error: updateError } = await supabase
    .from("books")
    .update({ available_copies: book.available_copies + 1 })
    .eq("id", book.id);

  if (updateError) throw new Error(updateError.message);

  revalidatePath("/dashboard/loans");
  return { success: true };
}

export async function renewLoan(loanId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: loan } = await supabase
    .from("loans")
    .select("*")
    .eq("id", loanId)
    .single();

  if (!loan) throw new Error("Loan not found");
  if (loan.renewal_count >= RENEWAL_LIMIT) {
    throw new Error("Maximum renewals reached");
  }
  if (loan.status === "overdue") {
    throw new Error("Cannot renew an overdue loan");
  }

  const newDueAt = new Date(
    new Date(loan.due_at).getTime() + LOAN_DURATION_DAYS * 24 * 60 * 60 * 1000
  );

  const { error } = await supabase
    .from("loans")
    .update({
      due_at: newDueAt.toISOString(),
      renewal_count: loan.renewal_count + 1,
    })
    .eq("id", loanId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/loans");
  return { success: true, newDueAt: newDueAt.toISOString() };
}

export async function getAllActiveLoans() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("loans")
    .select("*, book:books(*), profile:profiles(full_name, email)")
    .in("status", ["active", "overdue"])
    .order("borrowed_at", { ascending: false });
  return data;
}
