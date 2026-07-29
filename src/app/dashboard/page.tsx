import { getCurrentUser, getProfile, getDashboardStats } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, BookMarked, AlertTriangle, Users, Calendar } from "lucide-react";
import { ChatWidget } from "@/components/ai/chat-widget";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getProfile(user.id);
  if (!profile) redirect("/login");

  const stats = await getDashboardStats();

  const statCards = [
    { title: "Total Books", value: stats.totalBooks ?? 0, icon: BookOpen, color: "text-blue-600" },
    { title: "Active Loans", value: stats.activeLoans ?? 0, icon: BookMarked, color: "text-green-600" },
    { title: "Overdue", value: stats.overdueLoans ?? 0, icon: AlertTriangle, color: "text-red-600" },
    { title: "Members", value: stats.totalMembers ?? 0, icon: Users, color: "text-purple-600" },
    { title: "Upcoming Events", value: stats.upcomingEvents ?? 0, icon: Calendar, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {profile.full_name}</h1>
        <p className="text-muted-foreground">
          {profile.role === "super_admin"
            ? "Full system access & analytics"
            : profile.role === "librarian"
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

      <ChatWidget />
    </div>
  );
}
