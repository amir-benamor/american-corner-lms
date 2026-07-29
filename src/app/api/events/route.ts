import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, description, type, start_date, end_date, location, max_capacity } = body;

    if (!title || !start_date || !end_date || !location) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const { error } = await supabase.from("events").insert({
      title,
      description: description || "",
      type: type || "other",
      start_date,
      end_date,
      location,
      max_capacity: max_capacity || 30,
      created_by: user.id,
    });

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 400 });
  }
}
