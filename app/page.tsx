"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { FileSpreadsheet } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard-header";
import { UploadZone } from "@/components/upload-zone";
import { ReceiptCard, type ReceiptData } from "@/components/receipt-card";
import { ReceiptsTable } from "@/components/receipts-table";
import { DestinationsPanel, DEFAULT_SHEET_URL, DEFAULT_DRIVE_URL } from "@/components/destinations-panel";
import { Button } from "@/components/ui/button";

interface AppReceiptData extends Omit<ReceiptData, 'status'> {
  file: File;
  status: "processing" | "ready" | "saved" | "error";
  errorMsg?: string;
  driveWebViewLink?: string;
}

export default function ReceiptDashboard() {
  const { data: session } = useSession();
  const [receipts, setReceipts] = useState<AppReceiptData[]>([]);
  
  // Destination state
  const [sheetId, setSheetId] = useState("");
  const [folderName, setFolderName] = useState("");
  const [defaultSheetId, setDefaultSheetId] = useState("");
  const [defaultFolderName, setDefaultFolderName] = useState("");

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(d => {
      setDefaultSheetId(d.defaultSheetId || '');
      setDefaultFolderName(d.defaultFolderName || 'ReceiptAutomation');
    }).catch(() => {});
    const savedSheet = localStorage.getItem('receiptai_customSheetId') || '';
    const savedFolder = localStorage.getItem('receiptai_customFolderName') || '';
    setSheetId(savedSheet);
    setFolderName(savedFolder);
  }, []);

  const handleSheetUrlChange = (val: string) => {
    setSheetId(val);
    localStorage.setItem('receiptai_customSheetId', val);
  };
  const handleDriveUrlChange = (val: string) => {
    setFolderName(val);
    localStorage.setItem('receiptai_customFolderName', val);
  };

  const ocrFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'OCR failed');
    return data.extracted || {};
  };

  const saveReceiptApi = async (receipt: AppReceiptData) => {
    const form = new FormData();
    form.append('file', receipt.file);
    form.append('vendor', receipt.merchantName);
    form.append('date', receipt.date);
    form.append('amount', String(receipt.totalAmount).replace(/[^0-9.]/g, ''));
    form.append('currency', 'JPY');
    form.append('category', receipt.category);
    form.append('description', receipt.description || '');
    if (sheetId) form.append('customSheetId', sheetId);
    if (folderName) form.append('customFolderName', folderName);

    const res = await fetch('/api/save', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Save failed');
    return data;
  };

  const handleFilesSelected = useCallback(async (files: File[]) => {
    const processedFiles: File[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isHEIC = ext === 'heic' || ext === 'heif' || file.type === 'image/heic' || file.type === 'image/heif';
      if (isHEIC) {
        try {
          const heic2any = (await import('heic2any')).default;
          const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
          const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          processedFiles.push(new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' }));
        } catch (err) {
          processedFiles.push(file);
        }
      } else {
        processedFiles.push(file);
      }
    }

    const newReceipts: AppReceiptData[] = processedFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      imageUrl: URL.createObjectURL(file),
      merchantName: "",
      totalAmount: "",
      date: "",
      category: "会議費",
      description: "",
      confidence: 0,
      status: "processing",
    }));

    setReceipts((prev) => [...newReceipts, ...prev]);

    for (const receipt of newReceipts) {
      try {
        const extracted = await ocrFile(receipt.file);
        setReceipts((prev) =>
          prev.map((r) =>
            r.id === receipt.id
              ? { 
                  ...r, 
                  merchantName: extracted.vendor || "",
                  totalAmount: String(extracted.amount || 0),
                  date: extracted.date || new Date().toISOString().split('T')[0],
                  category: extracted.category || "会議費",
                  description: "",
                  confidence: 95,
                  status: "ready" as const 
                }
              : r
          )
        );
      } catch (err) {
        setReceipts((prev) =>
          prev.map((r) => r.id === receipt.id ? { ...r, status: "error", errorMsg: "Failed to read receipt" } : r)
        );
      }
    }
  }, []);

  const handleUpdateReceipt = useCallback((id: string, data: Partial<ReceiptData>) => {
    setReceipts((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
  }, []);

  const handleDeleteReceipt = useCallback((id: string) => {
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleSaveReceipt = useCallback(async (id: string) => {
    setReceipts((prev) => prev.map((r) => (r.id === id ? { ...r, status: "processing" } : r)));
    const receiptToSave = receipts.find(r => r.id === id);
    if (!receiptToSave) return;
    
    try {
      const data = await saveReceiptApi(receiptToSave);
      setReceipts((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "saved", driveWebViewLink: data.driveWebViewLink } : r))
      );
    } catch (e) {
      setReceipts((prev) => prev.map((r) => (r.id === id ? { ...r, status: "error", errorMsg: "Failed to save" } : r)));
    }
  }, [receipts, sheetId, folderName]);

  const handleExportAll = useCallback(async () => {
    const readyReceipts = receipts.filter(r => r.status === "ready");
    for (const r of readyReceipts) {
      await handleSaveReceipt(r.id);
    }
  }, [receipts, handleSaveReceipt]);

  const readyReceipts = receipts.filter((r) => r.status === "ready");
  const processingCount = receipts.filter((r) => r.status === "processing").length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={session?.user || null} onSignIn={() => signIn('google')} onSignOut={() => signOut()} />
      
      <main className="mx-auto max-w-6xl px-4 py-8">
        {!session ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="rounded-xl bg-card border border-border p-8 text-center max-w-md">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                Welcome to ReceiptAI
              </h1>
              <p className="text-muted-foreground mb-6">
                Upload receipts and let AI automatically extract merchant names, amounts, dates, and categories. Export directly to Google Sheets.
              </p>
              <Button onClick={() => signIn('google')} size="lg" className="gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <DestinationsPanel
              sheetUrl={sheetId || defaultSheetId}
              driveUrl={folderName || defaultFolderName}
              onSheetUrlChange={handleSheetUrlChange}
              onDriveUrlChange={handleDriveUrlChange}
            />

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Upload Receipts</h2>
                {readyReceipts.length > 0 && (
                  <Button onClick={handleExportAll} variant="outline" size="sm" className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Export All to Sheets ({readyReceipts.length})
                  </Button>
                )}
              </div>
              <UploadZone onFilesSelected={handleFilesSelected} />
            </section>

            {receipts.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">Processing Queue</h2>
                  {processingCount > 0 && (
                    <span className="rounded-full bg-warning px-2 py-0.5 text-xs font-medium text-warning-foreground">
                      {processingCount} processing
                    </span>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                  {receipts.map((receipt) => (
                    <ReceiptCard
                      key={receipt.id}
                      receipt={receipt as any}
                      onUpdate={handleUpdateReceipt}
                      onDelete={handleDeleteReceipt}
                      onSave={handleSaveReceipt}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
