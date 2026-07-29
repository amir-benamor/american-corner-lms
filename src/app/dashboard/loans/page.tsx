import { getCurrentUser, getProfile, getActiveLoans, getLoanHistory } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, CheckCircle, AlertTriangle, RotateCcw } from "lucide-react";
import { daysUntil, isOverdue, formatDateShort } from "@/lib/utils/format";
import { renewLoan as renewLoanAction } from "@/lib/actions/loans";

async function renewLoan(loanId: string) {
  "use server";
  await renewLoanAction(loanId);
}

export default async function LoansPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getProfile(user.id);
  if (!profile) redirect("/login");

  const isStaff = profile.role === "super_admin" || profile.role === "librarian";

  let activeLoans;
  if (isStaff) {
    const { getAllActiveLoans } = await import("@/lib/actions/loans");
    activeLoans = await getAllActiveLoans();
  } else {
    activeLoans = await getActiveLoans(user.id);
  }

  const loanHistory = !isStaff ? await getLoanHistory(user.id) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Loans</h1>
        <p className="text-muted-foreground">
          {isStaff ? "All active loans in the library" : "Your borrowed books"}
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Active Loans
        </h2>
        {activeLoans && activeLoans.length > 0 ? (
          activeLoans.map((loan: any) => {
            const overdue = loan.status === "overdue" || isOverdue(loan.due_at);
            const daysLeft = daysUntil(loan.due_at);
            return (
              <Card key={loan.id} className={overdue ? "border-red-300 bg-red-50/50" : ""}>
                <CardContent className="p-4 flex items-center gap-4">
                  {loan.book?.cover_url ? (
                    <img src={loan.book.cover_url} alt="" className="h-16 w-12 object-cover rounded flex-shrink-0" />
                  ) : (
                    <div className="h-16 w-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{loan.book?.title || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{loan.book?.author}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={overdue ? "destructive" : "secondary"} className="text-xs">
                        {overdue ? (
                          <><AlertTriangle className="h-3 w-3 mr-1" /> {Math.abs(daysLeft)} days overdue</>
                        ) : (
                          <><Clock className="h-3 w-3 mr-1" /> {daysLeft} days left</>
                        )}
                      </Badge>
                      {loan.renewal_count > 0 && (
                        <span className="text-xs text-muted-foreground">Renewed {loan.renewal_count}x</span>
                      )}
                    </div>
                  </div>
                  {!isStaff && !overdue && loan.renewal_count < 2 && (
                    <form action={renewLoan.bind(null, loan.id)}>
                      <Button variant="outline" size="sm" type="submit">
                        <RotateCcw className="h-3 w-3 mr-1" /> Renew
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No active loans</p>
        )}
      </div>

      {loanHistory && loanHistory.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Return History (Last 20)
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {loanHistory.map((loan: any) => (
              <Card key={loan.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  {loan.book?.cover_url ? (
                    <img src={loan.book.cover_url} alt="" className="h-12 w-9 object-cover rounded flex-shrink-0" />
                  ) : (
                    <div className="h-12 w-9 bg-muted rounded flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{loan.book?.title}</p>
                    <p className="text-xs text-muted-foreground">Returned {formatDateShort(loan.returned_at)}</p>
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
