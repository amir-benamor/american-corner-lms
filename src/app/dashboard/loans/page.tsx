"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, CheckCircle, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(p);

      const isStaff = p?.role === "super_admin" || p?.role === "librarian";
      let activeQuery = supabase.from("loans").select("*, book:books(*)").in("status", ["active", "overdue"]).order("borrowed_at", { ascending: false })
      if (!isStaff) activeQuery = activeQuery.eq("user_id", user.id);
      const { data: active } = await activeQuery;
      setLoans(active || []);

      if (!isStaff) {
        const { data: hist } = await supabase.from("loans").select("*, book:books(*)").eq("user_id", user.id).eq("status", "returned").order("returned_at", { ascending: false }).limit(20);
        setHistory(hist || []);
      }
      setLoading(false);
    });
  }, [router]);

  async function renew(loanId: string) {
    const supabase = createClient();
    const { data: loan } = await supabase.from("loans").select("*").eq("id", loanId).single();
    if (!loan || loan.renewal_count >= 2 || loan.status === "overdue") return;
    const newDue = new Date(new Date(loan.due_at).getTime() + 14 * 24 * 60 * 60 * 1000);
    await supabase.from("loans").update({ due_at: newDue.toISOString(), renewal_count: loan.renewal_count + 1 }).eq("id", loanId);
    const { data: updated } = await supabase.from("loans").select("*, book:books(*)").in("status", ["active", "overdue"]).order("borrowed_at", { ascending: false });
    setLoans(updated || []);
  }

  function daysUntil(d: string) {
    return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Loans</h1>
        <p className="text-muted-foreground">{profile?.role === "member" ? "Your borrowed books" : "All active loans"}</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5" />Active Loans</h2>
        {loans.length ? loans.map((loan: any) => {
          const daysLeft = daysUntil(loan.due_at);
          const overdue = loan.status === "overdue" || daysLeft < 0;
          return (
            <Card key={loan.id} className={overdue ? "border-red-300 bg-red-50/50" : ""}>
              <CardContent className="p-4 flex items-center gap-4">
                {loan.book?.cover_url ? <img src={loan.book.cover_url} alt="" className="h-16 w-12 object-cover rounded flex-shrink-0" /> : <div className="h-16 w-12 bg-muted rounded flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{loan.book?.title}</p>
                  <p className="text-xs text-muted-foreground">{loan.book?.author}</p>
                  <Badge variant={overdue ? "destructive" : "secondary"} className="text-xs mt-1">
                    {overdue ? <><AlertTriangle className="h-3 w-3 mr-1" />{Math.abs(daysLeft)} days overdue</> : <><Clock className="h-3 w-3 mr-1" />{daysLeft} days left</>}
                  </Badge>
                </div>
                {profile?.role === "member" && !overdue && loan.renewal_count < 2 && (
                  <Button variant="outline" size="sm" onClick={() => renew(loan.id)}><RotateCcw className="h-3 w-3 mr-1" /> Renew</Button>
                )}
              </CardContent>
            </Card>
          );
        }) : <p className="text-center py-8 text-muted-foreground">No active loans</p>}
      </div>

      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2"><CheckCircle className="h-5 w-5" />Return History</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {history.map((loan: any) => (
              <Card key={loan.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  {loan.book?.cover_url ? <img src={loan.book.cover_url} alt="" className="h-12 w-9 object-cover rounded flex-shrink-0" /> : <div className="h-12 w-9 bg-muted rounded flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{loan.book?.title}</p>
                    <p className="text-xs text-muted-foreground">Returned {new Date(loan.returned_at).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
