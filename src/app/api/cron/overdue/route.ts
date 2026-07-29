import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    const { data: overdueLoans } = await supabase
      .from("loans")
      .select("*, profiles(email, full_name), books(title)")
      .lt("due_at", new Date().toISOString())
      .in("status", ["active"]);

    if (!overdueLoans?.length) {
      return NextResponse.json({ processed: 0 });
    }

    const loanIds = overdueLoans.map((l) => l.id);

    await supabase
      .from("loans")
      .update({ status: "overdue" })
      .in("id", loanIds);

    await supabase.from("overdue_fees").insert(
      overdueLoans.map((loan) => ({
        loan_id: loan.id,
        user_id: loan.user_id,
        amount: Math.ceil(
          (new Date().getTime() - new Date(loan.due_at).getTime()) /
            (1000 * 60 * 60 * 24) *
            0.5
        ),
      }))
    );

    if (process.env.RESEND_API_KEY) {
      for (const loan of overdueLoans) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "American Corner Sousse <library@americancornersousse.org>",
              to: loan.profiles.email,
              subject: "Overdue Book Notice",
              html: `<p>Dear ${loan.profiles.full_name},</p>
<p>The book "<strong>${loan.books.title}</strong>" is now overdue. Please return it as soon as possible to avoid additional fees.</p>
<p>Thank you,<br/>American Corner Sousse Library</p>`,
            }),
          });
        } catch {
          // email fail silently
        }
      }
    }

    return NextResponse.json({ processed: overdueLoans.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
