import { NextResponse } from "next/server";

function cleanUrl(url: string) {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ message: "No token" }, { status: 401 });

    const { createClient } = await import("@supabase/supabase-js");
    const serviceClient = createClient(
      cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!),
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await serviceClient.auth.getUser(token);
    if (error || !user) return NextResponse.json({ message: "Invalid token" }, { status: 401 });

    // Check if profile exists
    const { data: existing } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ profile: existing });
    }

    // Create profile
    const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
    const { data: newProfile, error: insertError } = await serviceClient
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email || "",
        full_name: fullName,
        role: "member",
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return NextResponse.json({ profile: newProfile });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
