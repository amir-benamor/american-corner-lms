"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, BookMarked, AlertTriangle, Users, Calendar, Loader2, Database } from "lucide-react";
import { ChatWidget } from "@/components/ai/chat-widget";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(profile);

      const [booksRes, loansRes, overdueRes, membersRes, eventsRes] = await Promise.all([
        supabase.from("books").select("*", { count: "exact", head: true }),
        supabase.from("loans").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("loans").select("*", { count: "exact", head: true }).eq("status", "overdue"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "member"),
        supabase.from("events").select("*", { count: "exact", head: true }).gte("start_date", new Date().toISOString()),
      ]);

      setStats({
        totalBooks: booksRes.count,
        activeLoans: loansRes.count,
        overdueLoans: overdueRes.count,
        totalMembers: membersRes.count,
        upcomingEvents: eventsRes.count,
      });
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    { title: "Total Books", value: stats?.totalBooks ?? 0, icon: BookOpen, color: "text-blue-600" },
    { title: "Active Loans", value: stats?.activeLoans ?? 0, icon: BookMarked, color: "text-green-600" },
    { title: "Overdue", value: stats?.overdueLoans ?? 0, icon: AlertTriangle, color: "text-red-600" },
    { title: "Members", value: stats?.totalMembers ?? 0, icon: Users, color: "text-purple-600" },
    { title: "Upcoming Events", value: stats?.upcomingEvents ?? 0, icon: Calendar, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {profile?.full_name}</h1>
        <p className="text-muted-foreground">
          {profile?.role === "super_admin"
            ? "Full system access & analytics"
            : profile?.role === "librarian"
            ? "Manage catalog, loans, and events"
            : "Browse books and manage your account"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(stats?.totalBooks === 0 || stats?.upcomingEvents === 0) && (profile?.role === "super_admin" || profile?.role === "librarian") && (
        <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
          <CardContent className="p-6 text-center space-y-3">
            <Database className="h-8 w-8 mx-auto text-primary" />
            <p className="font-medium">Library is empty</p>
            <p className="text-sm text-muted-foreground">Click below to add sample books and events for your demo.</p>
            <Button
              onClick={async () => {
                setSeeding(true);
                setSeedMsg("Seeding data...");
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) { setSeedMsg("Not logged in"); setSeeding(false); return; }
                const res = await fetch("/api/seed", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${session.access_token}` },
                });
                const data = await res.json();
                if (data.success) {
                  setSeedMsg(`Added ${data.books} books, ${data.events} events! Refreshing...`);
                  setTimeout(() => window.location.reload(), 1500);
                } else {
                  setSeedMsg(data.message || "Failed");
                  setSeeding(false);
                }
              }}
              disabled={seeding}
            >
              {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
              {seeding ? seedMsg : "Setup Demo Data"}
            </Button>
          </CardContent>
        </Card>
      )}

      <ChatWidget />
    </div>
  );
}
