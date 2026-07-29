import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser, getProfile } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, CreditCard } from "lucide-react";

export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getProfile(user.id);
  if (!profile || profile.role === "member") redirect("/dashboard");

  const supabase = await createServerSupabaseClient();
  const { data: members } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-muted-foreground">{members?.length || 0} registered members</p>
      </div>

      <div className="grid gap-3">
        {members?.map((member) => (
          <Card key={member.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">
                  {member.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{member.full_name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{member.email}</span>
                  {member.membership_barcode && (
                    <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" />{member.membership_barcode}</span>
                  )}
                </div>
              </div>
              <Badge variant={member.role === "super_admin" ? "default" : member.role === "librarian" ? "secondary" : "outline"}>
                {member.role.replace("_", " ")}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
