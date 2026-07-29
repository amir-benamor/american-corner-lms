import { getCurrentUser, getProfile } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";
import { Sidebar } from "./sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) { redirect("/login"); return; }

    const profile = await getProfile(user.id);
    if (!profile) { redirect("/login"); return; }

    return (
      <div className="flex min-h-screen">
        <Sidebar role={profile.role} userName={profile.full_name} />
        <main className="ml-64 flex-1 p-6 bg-background">{children}</main>
      </div>
    );
  } catch {
    redirect("/login");
  }
}
