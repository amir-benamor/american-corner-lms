import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { event_id } = await req.json();
    if (!event_id) return NextResponse.json({ message: "Missing event_id" }, { status: 400 });

    const service = await createServiceClient();

    const { data: event } = await service
      .from("events")
      .select("id, title, max_capacity, registered_count, start_date")
      .eq("id", event_id)
      .maybeSingle();
    if (!event) return NextResponse.json({ message: "Event not found" }, { status: 404 });

    if (new Date(event.start_date) < new Date()) {
      return NextResponse.json({ message: "This event has already started" }, { status: 400 });
    }

    const { data: existing } = await service
      .from("event_registrations")
      .select("id")
      .eq("event_id", event_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ message: "You are already registered for this event" }, { status: 409 });
    }

    if (event.registered_count >= event.max_capacity) {
      return NextResponse.json({ message: "This event is full" }, { status: 400 });
    }

    const { error: insertError } = await service.from("event_registrations").insert({
      event_id,
      user_id: user.id,
    });
    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ message: "You are already registered for this event" }, { status: 409 });
      }
      throw insertError;
    }

    await service
      .from("events")
      .update({ registered_count: event.registered_count + 1 })
      .eq("id", event_id);

    return NextResponse.json({ success: true, registered_count: event.registered_count + 1 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Registration failed" }, { status: 500 });
  }
}
