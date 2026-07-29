"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../supabase/server";
import { loginSchema, registerSchema, magicLinkSchema } from "../validations/auth";

export async function login(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const data = loginSchema.parse(Object.fromEntries(formData));

  const { error } = await supabase.auth.signInWithPassword(data);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function register(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const data = registerSchema.parse(Object.fromEntries(formData));

  const { error, data: authData } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { full_name: data.full_name },
    },
  });
  if (error) throw new Error(error.message);

  if (authData.user) {
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      email: data.email,
      full_name: data.full_name,
      role: "member",
    });
    if (profileError) throw new Error(profileError.message);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function sendMagicLink(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const data = magicLinkSchema.parse(Object.fromEntries(formData));

  const { error } = await supabase.auth.signInWithOtp({
    email: data.email,
    options: {
      shouldCreateUser: true,
    },
  });
  if (error) throw new Error(error.message);

  return { success: true };
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
