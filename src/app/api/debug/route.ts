import { NextResponse } from "next/server";

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  // Raw HTTP test with service key
  let rawSvc = "unknown";
  try {
    const r = await fetch(`${base}/rest/v1/books?select=id&limit=1`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    rawSvc = `${r.status} ${await r.text()}`;
  } catch (e: any) { rawSvc = `throw: ${e.message}`; }

  // Raw HTTP with service key but NO Authorization header
  let rawSvcNoAuth = "unknown";
  try {
    const r = await fetch(`${base}/rest/v1/books?select=id&limit=1`, {
      headers: { apikey: serviceKey },
    });
    rawSvcNoAuth = `${r.status} ${await r.text()}`;
  } catch (e: any) { rawSvcNoAuth = `throw: ${e.message}`; }

  // Raw HTTP with anon key
  let rawAnon = "unknown";
  try {
    const r = await fetch(`${base}/rest/v1/books?select=id&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    rawAnon = `${r.status} ${await r.text()}`;
  } catch (e: any) { rawAnon = `throw: ${e.message}`; }

  // Test with supabase-js client (same as seed)
  const { createClient } = await import("@supabase/supabase-js");
  const svc = createClient(base, serviceKey, { auth: { persistSession: false } });
  let jsSvc = "unknown";
  try {
    const { data, error } = await svc.from("books").select("id").limit(1);
    jsSvc = error ? error.message : `ok rows=${data?.length}`;
  } catch (e: any) { jsSvc = `throw: ${e.message}`; }

  return NextResponse.json({
    base,
    serviceKeyLength: serviceKey.length,
    serviceKeyPrefix: serviceKey.substring(0, 30),
    anonKeyPrefix: anonKey.substring(0, 30),
    rawServiceSelect: rawSvc,
    rawServiceNoAuth: rawSvcNoAuth,
    rawAnonSelect: rawAnon,
    jsClientSelect: jsSvc,
  });
}
