"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function init() {
      try {
        const timer = setTimeout(() => {
          if (!cancelled) { setError("Auth timed out — check your Supabase URL env var"); setLoading(false); }
        }, 15000);

        const { data: { user } } = await supabase.auth.getUser();
        clearTimeout(timer);

        if (!user || cancelled) { router.push("/login"); return; }

        let profile = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle().then(r => r.data);

        if (!profile) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            try {
              const res = await fetch("/api/profile", {
                method: "POST",
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
              if (res.ok) {
                const data = await res.json();
                profile = data.profile;
              }
            } catch {}
          }
        }

        if (!cancelled) {
          setProfile(profile);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) { setError(String(e?.message || e)); setLoading(false); }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-destructive/10 text-destructive border border-destructive/30 rounded-lg p-6 max-w-md text-center space-y-2">
          <p className="font-semibold">Dashboard Error</p>
          <p className="text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="text-sm underline">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={profile?.role || "member"} userName={profile?.full_name || ""} />
      <main className="ml-64 flex-1 p-6 bg-background">{children}</main>
    </div>
  );
}
