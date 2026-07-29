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

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
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
      } catch {
        if (!cancelled) { setLoading(false); router.push("/login"); }
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
          <p className="text-sm text-muted-foreground">Loading...</p>
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
