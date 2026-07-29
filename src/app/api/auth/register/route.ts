import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { full_name, email, password } = await req.json();
    const supabase = await createServerSupabaseClient();
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    });
    if (error) throw new Error(error.message);

    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        email,
        full_name,
        role: "member",
      });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 400 });
  }
}
