'use client';

import { useState } from 'react';

const CATEGORIES = [
    '会議費',
    '交際費',
    '旅費交通費',
    '通信費',
    '消耗品費',
    '新聞図書費',
    '広告宣伝費',
    '水道光熱費',
    '地代家賃',
    '雑費',
    'その他',
];

export interface ReceiptFormData {
    vendor: string;
    date: string;
    amount: number;
    currency: string;
    category: string;
    description: string;
}

interface ReceiptPreviewProps {
    file: File;
    initialData: Partial<ReceiptFormData>;
    onConfirm: (data: ReceiptFormData) => void;
    onCancel: () => void;
    isSaving: boolean;
}

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: '0.4rem',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
    borderRadius: '0.75rem',
    padding: '0.625rem 0.875rem',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
};

export default function ReceiptPreview({
    file,
    initialData,
    onConfirm,
    onCancel,
    isSaving,
}: ReceiptPreviewProps) {
    const [form, setForm] = useState<ReceiptFormData>({
        vendor: initialData.vendor || '',
        date: initialData.date || new Date().toISOString().slice(0, 10),
        amount: initialData.amount || 0,
        currency: initialData.currency || 'JPY',
        category: initialData.category || CATEGORIES[0],
        description: initialData.description || '',
    });

    const [focusedField, setFocusedField] = useState<string | null>(null);

    const previewUrl = URL.createObjectURL(file);
    const isPdf = file.type === 'application/pdf';
    const isHEIC = file.type === 'image/heic' || file.type === 'image/heif';
    const hasAIData = !!(initialData.vendor || initialData.amount);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: name === 'amount' ? parseFloat(value) || 0 : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(form);
    };

    const getFocusStyle = (fieldName: string): React.CSSProperties => ({
        ...inputStyle,
        borderColor: focusedField === fieldName ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)',
        boxShadow: focusedField === fieldName ? '0 0 0 3px rgba(139,92,246,0.15)' : 'none',
        background: focusedField === fieldName ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Left: Receipt image ── */}
            <div
                className="rounded-2xl overflow-hidden flex items-center justify-center min-h-[320px] relative"
                style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.3)',
                }}
            >
                {isPdf || isHEIC ? (
                    <div className="flex flex-col items-center gap-3 p-8">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center"
                            style={{
                                background: 'rgba(139,92,246,0.1)',
                                border: '1px solid rgba(139,92,246,0.2)',
                            }}
                        >
                            {isHEIC ? (
                                <svg className="w-8 h-8" style={{ color: '#a78bfa' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                </svg>
                            ) : (
                                <svg className="w-8 h-8" style={{ color: '#a78bfa' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                            )}
                        </div>
                        <p className="text-sm text-white/60 font-medium">{file.name}</p>
                        <p className="text-xs text-white/30">{isHEIC ? 'HEIC — AI is reading this image' : 'PDF preview not available'}</p>
                    </div>
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={previewUrl}
                        alt="Receipt preview"
                        className="max-h-[420px] w-full object-contain"
                        style={{ borderRadius: '1.25rem' }}
                    />
                )}

                {/* AI confidence badge */}
                {hasAIData && (
                    <div
                        className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                        style={{
                            background: 'rgba(8,8,26,0.8)',
                            border: '1px solid rgba(139,92,246,0.3)',
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400" style={{ animation: 'pulse 2s infinite' }} />
                        <span className="text-xs font-semibold" style={{ color: '#c4b5fd' }}>AI Extracted</span>
                    </div>
                )}
            </div>

            {/* ── Right: Form ── */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                {/* Vendor */}
                <div>
                    <label style={labelStyle}>Merchant / 販売店</label>
                    <input
                        name="vendor"
                        type="text"
                        value={form.vendor}
                        onChange={handleChange}
                        onFocus={() => setFocusedField('vendor')}
                        onBlur={() => setFocusedField(null)}
                        required
                        style={getFocusStyle('vendor')}
                        placeholder="e.g. Shell Gas, コンビニ太郎"
                    />
                </div>

                {/* Date */}
                <div>
                    <label style={labelStyle}>Date / 日付</label>
                    <input
                        name="date"
                        type="date"
                        value={form.date}
                        onChange={handleChange}
                        onFocus={() => setFocusedField('date')}
                        onBlur={() => setFocusedField(null)}
                        required
                        style={getFocusStyle('date')}
                    />
                </div>

                {/* Amount + Currency */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label style={labelStyle}>Amount / 金額</label>
                        <input
                            name="amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.amount}
                            onChange={handleChange}
                            onFocus={() => setFocusedField('amount')}
                            onBlur={() => setFocusedField(null)}
                            required
                            style={getFocusStyle('amount')}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Currency / 通貨</label>
                        <select
                            name="currency"
                            value={form.currency}
                            onChange={handleChange}
                            onFocus={() => setFocusedField('currency')}
                            onBlur={() => setFocusedField(null)}
                            style={getFocusStyle('currency')}
                        >
                            <option value="JPY">JPY ¥</option>
                            <option value="USD">USD $</option>
                            <option value="EUR">EUR €</option>
                        </select>
                    </div>
                </div>

                {/* Category */}
                <div>
                    <label style={labelStyle}>Category / 勘定科目</label>
                    <select
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        onFocus={() => setFocusedField('category')}
                        onBlur={() => setFocusedField(null)}
                        style={getFocusStyle('category')}
                    >
                        {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                {/* Description */}
                <div>
                    <label style={labelStyle}>Notes / 摘要 <span style={{ color: 'rgba(255,255,255,0.2)' }}>(optional)</span></label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        onFocus={() => setFocusedField('description')}
                        onBlur={() => setFocusedField(null)}
                        rows={2}
                        style={{
                            ...getFocusStyle('description'),
                            resize: 'none',
                        }}
                        placeholder="Any additional notes…"
                    />
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 0' }} />

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSaving}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-40"
                        style={{
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: 'rgba(255,255,255,0.55)',
                            background: 'transparent',
                        }}
                        onMouseEnter={e => {
                            if (!isSaving) {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                            }
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-2 flex-1 py-2.5 px-6 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-200"
                        style={{
                            background: isSaving
                                ? 'rgba(99,102,241,0.4)'
                                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            boxShadow: isSaving ? 'none' : '0 4px 20px rgba(99,102,241,0.3)',
                        }}
                        onMouseEnter={e => {
                            if (!isSaving) e.currentTarget.style.boxShadow = '0 8px 30px rgba(99,102,241,0.5)';
                        }}
                        onMouseLeave={e => {
                            if (!isSaving) e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.3)';
                        }}
                    >
                        {isSaving ? (
                            <>
                                <div
                                    className="w-4 h-4 rounded-full border-2 animate-spin"
                                    style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}
                                />
                                Saving…
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Save Receipt
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
