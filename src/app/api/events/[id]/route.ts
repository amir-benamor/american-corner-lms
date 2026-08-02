import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase/server";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const isStaff = profile?.role === "super_admin" || profile?.role === "librarian";
    if (!isStaff) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const service = await createServiceClient();

    const { data: event } = await service.from("events").select("id, title").eq("id", params.id).maybeSingle();
    if (!event) return NextResponse.json({ message: "Event not found" }, { status: 404 });

    const { error } = await service.from("events").delete().eq("id", event.id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to delete event" }, { status: 500 });
  }
}
