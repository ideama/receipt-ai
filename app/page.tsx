'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import UploadArea from '@/components/UploadArea';
import ReceiptPreview, { ReceiptFormData } from '@/components/ReceiptPreview';
import BulkQueueView from '@/components/BulkQueueView';

// ─── Types ───────────────────────────────────────────────────────────────────

type AppState = 'idle' | 'extracting' | 'preview' | 'saving' | 'success' | 'error' | 'bulk';

interface ExtractedData {
    vendor: string;
    date: string;
    amount: number;
    currency: string;
}

interface SaveResult {
    fileName: string;
    driveWebViewLink: string;
}

export interface BulkItem {
    id: string;
    file: File;
    status: 'extracting' | 'ready' | 'saving' | 'saved' | 'error';
    formData: ReceiptFormData;
    result?: SaveResult;
    error?: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
    const { data: session, status } = useSession();

    const [appState, setAppState] = useState<AppState>('idle');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [extracted, setExtracted] = useState<Partial<ExtractedData>>({});
    const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);

    const today = () => new Date().toISOString().split('T')[0];

    const ocrFile = async (file: File): Promise<Partial<ExtractedData>> => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'OCR failed');
        return data.extracted || {};
    };

    const saveReceipt = async (file: File, fd: ReceiptFormData): Promise<SaveResult> => {
        const form = new FormData();
        form.append('file', file);
        form.append('vendor', fd.vendor);
        form.append('date', fd.date);
        form.append('amount', String(fd.amount));
        form.append('currency', fd.currency);
        form.append('category', fd.category);
        form.append('description', fd.description);
        const res = await fetch('/api/save', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Save failed');
        return { fileName: data.fileName, driveWebViewLink: data.driveWebViewLink };
    };

    const handleFilesSelected = useCallback(async (files: File[]) => {
        if (files.length === 1) {
            const file = files[0];
            setSelectedFile(file);
            setAppState('extracting');
            setErrorMsg('');
            try {
                const ex = await ocrFile(file);
                setExtracted(ex);
                setAppState('preview');
            } catch (e) {
                setErrorMsg(e instanceof Error ? e.message : 'Unknown error');
                setAppState('error');
            }
        } else {
            const items: BulkItem[] = files.map(file => ({
                id: uuidv4(),
                file,
                status: 'extracting',
                formData: { vendor: '', date: today(), amount: 0, currency: 'JPY', category: '会議費', description: '' },
            }));
            setBulkItems(items);
            setAppState('bulk');

            await Promise.all(items.map(async (item) => {
                try {
                    const ex = await ocrFile(item.file);
                    setBulkItems(prev => prev.map(i => i.id === item.id ? {
                        ...i,
                        status: 'ready',
                        formData: {
                            ...i.formData,
                            vendor: ex.vendor || '',
                            date: ex.date || today(),
                            amount: ex.amount || 0,
                            currency: ex.currency || 'JPY',
                        },
                    } : i));
                } catch {
                    setBulkItems(prev => prev.map(i => i.id === item.id ? {
                        ...i, status: 'error', error: 'OCR failed',
                    } : i));
                }
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleConfirm = async (formData: ReceiptFormData) => {
        if (!selectedFile) return;
        setAppState('saving');
        setErrorMsg('');
        try {
            const result = await saveReceipt(selectedFile, formData);
            setSaveResult(result);
            setAppState('success');
        } catch (e) {
            setErrorMsg(e instanceof Error ? e.message : 'Unknown error');
            setAppState('error');
        }
    };

    const handleReset = () => {
        setAppState('idle');
        setSelectedFile(null);
        setExtracted({});
        setSaveResult(null);
        setErrorMsg('');
        setBulkItems([]);
    };

    const handleBulkUpdate = (id: string, field: string, value: string | number) => {
        setBulkItems(prev => prev.map(i => i.id === id ? {
            ...i, formData: { ...i.formData, [field]: value },
        } : i));
    };

    const handleSaveAll = async () => {
        const readyItems = bulkItems.filter(i => i.status === 'ready');
        for (const item of readyItems) {
            setBulkItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'saving' } : i));
            try {
                const result = await saveReceipt(item.file, item.formData);
                setBulkItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'saved', result } : i));
            } catch (e) {
                setBulkItems(prev => prev.map(i => i.id === item.id ? {
                    ...i, status: 'error', error: e instanceof Error ? e.message : 'Save failed',
                } : i));
            }
        }
    };

    // ─── Loading ───────────────────────────────────────────────────────────────

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
                    <span className="text-white/40 text-sm font-medium">Loading…</span>
                </div>
            </div>
        );
    }

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen flex flex-col">

            {/* ── Header ── */}
            <header className="sticky top-0 z-50 glass" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
                <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Logo mark */}
                        <div className="rounded-xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', width: '32px', height: '32px', flexShrink: 0 }}>
                            <svg className="text-white" style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <span className="text-base font-semibold gradient-text tracking-tight">ReceiptAI</span>
                        <span className="text-xs text-white/25 hidden sm:block font-medium">確定申告用</span>
                    </div>

                    {session && (
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                    {session.user?.name?.charAt(0) ?? session.user?.email?.charAt(0) ?? 'U'}
                                </div>
                                <span className="text-sm text-white/50 hidden sm:block">{session.user?.email}</span>
                            </div>
                            <button
                                onClick={() => signOut()}
                                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 hover:bg-white/5 transition-all duration-200"
                            >
                                Sign out
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">

                {/* ── Not signed in ── */}
                {!session ? (
                    <div className="min-h-[75vh] flex items-center justify-center relative">
                        {/* Decorative orbs */}
                        <div className="glow-orb w-96 h-96 -top-20 -left-32 opacity-30"
                            style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
                        <div className="glow-orb w-80 h-80 -bottom-10 -right-20 opacity-20"
                            style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)', animationDelay: '4s' }} />

                        <div className="relative z-10 fade-in-up w-full max-w-md">
                            {/* Glass card */}
                            <div className="glass-card p-10 text-center shadow-2xl" style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)' }}>

                                {/* Icon */}
                                <div className="mx-auto mb-6 rounded-2xl flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(139,92,246,0.3)', width: '64px', height: '64px', flexShrink: 0 }}>
                                    <svg style={{ color: '#a78bfa', width: '32px', height: '32px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>

                                <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
                                    Welcome to <span className="gradient-text">ReceiptAI</span>
                                </h1>
                                <p className="text-white/50 text-sm leading-relaxed mb-8">
                                    Upload receipts and let AI automatically extract merchant names, amounts, dates, and categories. Export directly to Google Sheets.
                                </p>

                                {/* Features */}
                                <div className="grid grid-cols-3 gap-3 mb-8">
                                    {[
                                        { icon: '🤖', label: 'AI Extraction' },
                                        { icon: '📁', label: 'Google Drive' },
                                        { icon: '📊', label: 'Sheets Export' },
                                    ].map(f => (
                                        <div key={f.label} className="rounded-xl p-3 flex flex-col items-center gap-1.5"
                                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <span className="text-xl">{f.icon}</span>
                                            <span className="text-xs text-white/40 font-medium">{f.label}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Google sign-in button */}
                                <button
                                    onClick={() => signIn('google')}
                                    className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
                                    style={{
                                        background: 'linear-gradient(135deg, #4f52d3, #7c3aed)',
                                        boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 30px rgba(99,102,241,0.5)')}
                                    onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.3)')}
                                >
                                    {/* Google G */}
                                    <svg style={{ width: '20px', height: '20px', flexShrink: 0 }} viewBox="0 0 24 24">
                                        <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="rgba(255,255,255,0.8)" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="rgba(255,255,255,0.7)" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="rgba(255,255,255,0.6)" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Sign in with Google
                                </button>

                                <p className="mt-4 text-xs text-white/20">
                                    Secure · No data stored without your permission
                                </p>
                            </div>
                        </div>
                    </div>

                ) : (

                    <div className="space-y-8 fade-in-up">

                        {/* ── Page header ── */}
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">
                                Upload <span className="gradient-text">Receipts</span>
                            </h2>
                            <p className="text-white/40 text-sm mt-1">
                                Drag & drop images or PDFs — AI extracts data and saves to Drive + Sheets automatically.
                            </p>
                        </div>

                        {/* idle / error */}
                        {(appState === 'idle' || appState === 'error') && (
                            <>
                                <UploadArea onFilesSelected={handleFilesSelected} isLoading={false} />
                                {appState === 'error' && (
                                    <div className="rounded-xl px-4 py-3.5 flex items-center gap-3"
                                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ background: 'rgba(239,68,68,0.15)' }}>
                                            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-red-400 text-sm font-medium">Processing failed</p>
                                            <p className="text-red-400/60 text-xs mt-0.5">{errorMsg}</p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* extracting */}
                        {appState === 'extracting' && (
                            <UploadArea onFilesSelected={handleFilesSelected} isLoading={true} />
                        )}

                        {/* preview / saving */}
                        {(appState === 'preview' || appState === 'saving') && selectedFile && (
                            <div className="glass-card p-6 fade-in-up" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
                                <div className="flex items-center gap-2 mb-5">
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <h3 className="text-base font-semibold text-white">Review & Confirm</h3>
                                    <span className="text-xs text-white/30 ml-1">確認・修正</span>
                                </div>
                                <ReceiptPreview
                                    file={selectedFile}
                                    initialData={extracted}
                                    onConfirm={handleConfirm}
                                    onCancel={handleReset}
                                    isSaving={appState === 'saving'}
                                />
                            </div>
                        )}

                        {/* success */}
                        {appState === 'success' && saveResult && (
                            <div className="rounded-2xl p-10 text-center fade-in-up"
                                style={{
                                    background: 'rgba(34,197,94,0.06)',
                                    border: '1px solid rgba(34,197,94,0.2)',
                                    boxShadow: '0 0 60px rgba(34,197,94,0.08)',
                                }}>
                                {/* Animated check */}
                                <div className="mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center"
                                    style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
                                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-1">Saved Successfully!</h3>
                                <p className="text-white/40 text-sm mb-1">保存完了</p>
                                <p className="text-white/50 text-sm mt-3">
                                    File: <span className="text-white/70 font-mono text-xs bg-white/5 px-2 py-0.5 rounded">{saveResult.fileName}</span>
                                </p>
                                {saveResult.driveWebViewLink && (
                                    <a href={saveResult.driveWebViewLink} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                                        style={{
                                            background: 'rgba(34,197,94,0.12)',
                                            border: '1px solid rgba(34,197,94,0.25)',
                                            color: '#4ade80',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.2)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.12)')}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        View in Google Drive
                                    </a>
                                )}
                                <div className="mt-6">
                                    <button
                                        onClick={handleReset}
                                        className="btn-primary px-6 py-2.5 text-sm"
                                    >
                                        + Upload Another Receipt
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* bulk queue */}
                        {appState === 'bulk' && (
                            <BulkQueueView
                                items={bulkItems}
                                onUpdate={handleBulkUpdate}
                                onSaveAll={handleSaveAll}
                                onReset={handleReset}
                            />
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
