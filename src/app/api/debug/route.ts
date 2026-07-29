import { NextResponse } from "next/server";

function cleanUrl(url: string) {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT SET";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "NOT SET";

  const { createClient } = await import("@supabase/supabase-js");

  // Test SELECT with service key  
  const svc = createClient(cleanUrl(url), serviceKey as string, { auth: { persistSession: false } });
  let svcSelect: any = "unknown";
  try { const { data, error } = await svc.from("books").select("id").limit(1); svcSelect = error ? error.message : `ok rows=${data?.length}`; } catch (e: any) { svcSelect = `throw: ${e.message}`; }

  let svcInsert: any = "unknown";
  try { const { error } = await svc.from("books").insert({ title: "test", author: "test", isbn: `test-${Date.now()}`, genre: "test", language: "english", tags: [] }); svcInsert = error ? error.message : "SUCCESS"; } catch (e: any) { svcInsert = `throw: ${e.message}`; }

  // Test SELECT with anon key
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "NOT SET";
  const anon = createClient(cleanUrl(url), anonKey as string, { auth: { persistSession: false } });
  let anonSelect: any = "unknown";
  try { const { data, error } = await anon.from("books").select("id").limit(1); anonSelect = error ? error.message : `ok rows=${data?.length}`; } catch (e: any) { anonSelect = `throw: ${e.message}`; }

  let anonInsert: any = "unknown";
  try { const { error } = await anon.from("books").insert({ title: "test", author: "test", isbn: `test-${Date.now()}`, genre: "test", language: "english", tags: [] }); anonInsert = error ? error.message : "SUCCESS"; } catch (e: any) { anonInsert = `throw: ${e.message}`; }

  return NextResponse.json({
    rawUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "not set",
    cleanedUrl: cleanUrl(url),
    serviceKeyPrefix: serviceKey === "NOT SET" ? "NOT SET" : serviceKey.substring(0, 30) + "...",
    serviceSelect: svcSelect,
    serviceInsert: svcInsert,
    anonKeyPrefix: anonKey === "NOT SET" ? "NOT SET" : anonKey.substring(0, 30) + "...",
    anonSelect,
    anonInsert,
  });
}
