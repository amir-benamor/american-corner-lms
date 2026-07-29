import { createServerSupabaseClient } from "./server";
import type { Book, Loan, Hold, Event, Profile } from "@/types";

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}

export async function getBooks(params?: {
  search?: string;
  genre?: string;
  language?: string;
  cefr_level?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("books").select("*", { count: "exact" });

  if (params?.search) {
    query = query.or(
      `title.ilike.%${params.search}%,author.ilike.%${params.search}%,isbn.ilike.%${params.search}%`
    );
  }
  if (params?.genre) query = query.eq("genre", params.genre);
  if (params?.language) query = query.eq("language", params.language);
  if (params?.cefr_level) query = query.eq("cefr_level", params.cefr_level);

  query = query.order("title", { ascending: true });

  if (params?.limit) query = query.range(params.offset || 0, (params.offset || 0) + params.limit - 1);

  const { data, count } = await query;
  return { books: data as Book[] | null, count };
}

export async function getBookById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("books").select("*").eq("id", id).single();
  return data as Book | null;
}

export async function getActiveLoans(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("loans")
    .select("*, book:books(*)")
    .eq("user_id", userId)
    .in("status", ["active", "overdue"])
    .order("borrowed_at", { ascending: false });
  return data as (Loan & { book: Book })[] | null;
}

export async function getLoanHistory(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("loans")
    .select("*, book:books(*)")
    .eq("user_id", userId)
    .eq("status", "returned")
    .order("returned_at", { ascending: false })
    .limit(20);
  return data as (Loan & { book: Book })[] | null;
}

export async function getActiveHolds(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("holds")
    .select("*, book:books(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("placed_at", { ascending: false });
  return data as (Hold & { book: Book })[] | null;
}

export async function getUpcomingEvents(limit = 10) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .gte("start_date", new Date().toISOString())
    .order("start_date", { ascending: true })
    .limit(limit);
  return data as Event[] | null;
}

export async function getUserRegistrations(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("event_registrations")
    .select("*, event:events(*)")
    .eq("user_id", userId)
    .order("registered_at", { ascending: false });
  return data;
}

export async function getDashboardStats() {
  const supabase = await createServerSupabaseClient();
  const [
    { count: totalBooks },
    { count: activeLoans },
    { count: overdueLoans },
    { count: totalMembers },
    { count: upcomingEvents },
  ] = await Promise.all([
    supabase.from("books").select("*", { count: "exact", head: true }),
    supabase.from("loans").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("loans").select("*", { count: "exact", head: true }).eq("status", "overdue"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "member"),
    supabase.from("events").select("*", { count: "exact", head: true }).gte("start_date", new Date().toISOString()),
  ]);
  return { totalBooks, activeLoans, overdueLoans, totalMembers, upcomingEvents };
}
