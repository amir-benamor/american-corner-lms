"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, CreditCard, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (!p || p.role === "member") { router.push("/dashboard"); return; }
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      setMembers(data || []);
      setLoading(false);
    });
  }, [router]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-muted-foreground">{members.length} registered members</p>
      </div>
      <div className="grid gap-3">
        {members.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">{m.full_name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{m.full_name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{m.email}</span>
                  {m.membership_barcode && <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" />{m.membership_barcode}</span>}
                </div>
              </div>
              <Badge variant={m.role === "super_admin" ? "default" : m.role === "librarian" ? "secondary" : "outline"}>{m.role.replace("_", " ")}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
