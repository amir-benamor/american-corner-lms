"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "../supabase/server";
import { eventSchema } from "../validations/event";

export async function createEvent(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const data = eventSchema.parse(Object.fromEntries(formData));

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("events").insert({
    ...data,
    cover_image: data.cover_image || null,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/events");
}

export async function updateEvent(id: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const data = eventSchema.parse(Object.fromEntries(formData));

  const { error } = await supabase
    .from("events")
    .update({
      ...data,
      cover_image: data.cover_image || null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/events/${id}`);
}

export async function deleteEvent(id: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/events");
}

export async function registerForEvent(eventId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: event } = await supabase
    .from("events")
    .select("max_capacity, registered_count")
    .eq("id", eventId)
    .single();

  if (!event) throw new Error("Event not found");
  if (event.registered_count >= event.max_capacity) {
    throw new Error("Event is full");
  }

  const { error: regError } = await supabase.from("event_registrations").insert({
    event_id: eventId,
    user_id: user.id,
    qr_pass: `EVT-${eventId}-${user.id}-${Date.now().toString(36)}`.toUpperCase(),
  });

  if (regError) throw new Error(regError.message);

  await supabase
    .from("events")
    .update({ registered_count: event.registered_count + 1 })
    .eq("id", eventId);

  revalidatePath(`/events/${eventId}`);
}

export async function cancelRegistration(eventId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("event_registrations")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  await supabase.rpc("decrement_event_count", { event_id: eventId });
  revalidatePath(`/events/${eventId}`);
}
