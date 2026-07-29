"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, CameraOff, Loader2, ScanLine } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  mode?: "book" | "member";
  label?: string;
}

export function BarcodeScanner({ onScan, mode = "book", label }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");
  const [manualEntry, setManualEntry] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let interval: ReturnType<typeof setInterval>;
    let scannerModule: any = null;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) videoRef.current.srcObject = stream;

        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode("scanner-preview");
        scannerModule = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText: string) => {
            scanner.stop().catch(() => {});
            setScanning(false);
            setCode(decodedText);
            onScan(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        setError(err.message || "Camera access denied");
        setScanning(false);
      }
    }

    start();

    return () => {
      if (scannerModule) {
        scannerModule.stop().catch(() => {});
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [scanning, onScan]);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {label && <p className="text-sm font-medium">{label}</p>}

        {scanning ? (
          <div className="relative">
            <div id="scanner-preview" ref={videoRef as any} className="w-full aspect-video bg-black rounded-lg overflow-hidden" />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => setScanning(false)}
            >
              <CameraOff className="h-4 w-4 mr-1" />
              Stop
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => { setScanning(true); setError(""); }} className="flex-1">
              <Camera className="h-4 w-4 mr-2" />
              {error ? "Retry Scan" : `Scan ${mode === "book" ? "Book" : "Member"} ${mode === "book" ? "Barcode" : "QR Code"}`}
            </Button>
            <Button variant="outline" onClick={() => setManualEntry(!manualEntry)}>
              <ScanLine className="h-4 w-4" />
            </Button>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        {manualEntry && !scanning && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={`Enter ${mode === "book" ? "barcode" : "member code"} manually`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            />
            <Button size="sm" onClick={() => code && onScan(code)}>
              Submit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
