"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarcodeScanner } from "@/components/scanner/barcode-scanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ScanMode = "checkout" | "return";

export default function ScannerPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<ScanMode>("checkout");
  const [step, setStep] = useState<"member" | "book" | "done">("member");
  const [memberCode, setMemberCode] = useState("");
  const [bookCode, setBookCode] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; dueAt?: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const isStaff = p?.role === "super_admin" || p?.role === "librarian";
      if (!isStaff) { router.push("/dashboard"); return; }
      setChecking(false);
    });
  }, [router]);

  if (checking) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  function handleMemberScan(code: string) {
    setMemberCode(code);
    setStep("book");
    setResult(null);
  }

  function handleBookScan(code: string) {
    setBookCode(code);
    processTransaction(code);
  }

  async function processTransaction(code: string) {
    setProcessing(true);
    setResult(null);
    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          user_barcode: memberCode,
          book_barcode: code,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Transaction failed");
      setResult({ ok: true, message: `${mode === "checkout" ? "Checked out" : "Returned"} successfully!`, dueAt: data.dueAt });
    } catch (err: any) {
      setResult({ ok: false, message: err.message });
    } finally {
      setProcessing(false);
    }
  }

  function reset() {
    setStep("member");
    setMemberCode("");
    setBookCode("");
    setResult(null);
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fast Scan</h1>
        <p className="text-muted-foreground">Scan member QR and book barcode</p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={mode === "checkout" ? "default" : "outline"}
          onClick={() => { setMode("checkout"); reset(); }}
          className="flex-1"
        >
          Check Out
        </Button>
        <Button
          variant={mode === "return" ? "default" : "outline"}
          onClick={() => { setMode("return"); reset(); }}
          className="flex-1"
        >
          Return
        </Button>
      </div>

      {result ? (
        <Card className={result.ok ? "border-green-500" : "border-red-500"}>
          <CardContent className="p-6 text-center space-y-3">
            {result.ok ? (
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            ) : (
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            )}
            <p className="font-medium">{result.message}</p>
            {result.dueAt && (
              <p className="text-sm text-muted-foreground">Due: {new Date(result.dueAt).toLocaleDateString()}</p>
            )}
            <Button onClick={reset} className="mt-2">Scan Another</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {step === "member" && (
            <BarcodeScanner onScan={handleMemberScan} mode="member" label="Scan Member QR Code" />
          )}
          {step === "book" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">Member: {memberCode}</Badge>
                <Button variant="ghost" size="sm" onClick={reset}>Change</Button>
              </div>
              {processing ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Processing...</p>
                  </CardContent>
                </Card>
              ) : (
                <BarcodeScanner onScan={handleBookScan} mode="book" label={`Scan Book Barcode to ${mode === "checkout" ? "Check Out" : "Return"}`} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
