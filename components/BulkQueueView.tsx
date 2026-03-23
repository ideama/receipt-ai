'use client';

import { BulkItem } from '@/app/page';

const CATEGORIES = [
    '会議費', '接待交際費', '旅費交通費', '通信費', '消耗品費',
    '福利厚生費', '広告宣伝費', '水道光熱費', '地代家賃', '雑費',
];

interface BulkQueueViewProps {
    items: BulkItem[];
    onUpdate: (id: string, field: string, value: string | number) => void;
    onSaveAll: () => void;
    onReset: () => void;
}

function StatusBadge({ status }: { status: BulkItem['status'] }) {
    const configs: Record<BulkItem['status'], { label: string; style: React.CSSProperties; icon?: React.ReactNode }> = {
        extracting: {
            label: 'Extracting',
            style: { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a78bfa' },
            icon: (
                <div className="w-3 h-3 rounded-full border border-violet-400/50 border-t-violet-400 animate-spin" />
            ),
        },
        ready: {
            label: 'Ready',
            style: { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' },
            icon: <span>·</span>,
        },
        saving: {
            label: 'Saving',
            style: { background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.25)', color: '#facc15' },
            icon: (
                <div className="w-3 h-3 rounded-full border border-yellow-400/50 border-t-yellow-400 animate-spin" />
            ),
        },
        saved: {
            label: 'Saved',
            style: { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' },
            icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>,
        },
        error: {
            label: 'Error',
            style: { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' },
            icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>,
        },
    };
    const cfg = configs[status];
    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={cfg.style}
        >
            {cfg.icon}
            {cfg.label}
        </span>
    );
}

export default function BulkQueueView({ items, onUpdate, onSaveAll, onReset }: BulkQueueViewProps) {
    const readyCount = items.filter(i => i.status === 'ready').length;
    const savedCount = items.filter(i => i.status === 'saved').length;
    const allDone = items.every(i => i.status === 'saved' || i.status === 'error');
    const anySaving = items.some(i => i.status === 'saving' || i.status === 'extracting');

    const cellInput: React.CSSProperties = {
        width: '100%',
        background: 'transparent',
        color: 'rgba(255,255,255,0.85)',
        border: 'none',
        outline: 'none',
        fontSize: '0.8125rem',
        padding: '0.25rem 0.25rem',
    };

    const cellInputDisabled: React.CSSProperties = {
        ...cellInput,
        color: 'rgba(255,255,255,0.3)',
        cursor: 'default',
    };

    return (
        <div className="space-y-5 fade-in-up">

            {/* ── Top bar ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 className="text-lg font-bold text-white">
                        Bulk Upload
                        <span className="ml-2 text-sm font-normal gradient-text">一括アップロード</span>
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {items.length} files · {savedCount} saved
                        {readyCount > 0 && !allDone ? ` · ${readyCount} pending` : ''}
                    </p>
                </div>

                <div className="flex gap-2">
                    {allDone ? (
                        <button
                            onClick={onReset}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200"
                            style={{
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
                            }}
                        >
                            + New Upload
                        </button>
                    ) : (
                        <button
                            onClick={onSaveAll}
                            disabled={readyCount === 0 || anySaving}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                                background: readyCount === 0 || anySaving
                                    ? 'rgba(34,197,94,0.3)'
                                    : 'linear-gradient(135deg, #16a34a, #22c55e)',
                                boxShadow: readyCount > 0 && !anySaving ? '0 4px 15px rgba(34,197,94,0.25)' : 'none',
                            }}
                        >
                            {anySaving ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-3.5 h-3.5 rounded-full border border-green-300/40 border-t-green-300 animate-spin" />
                                    Saving…
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Save All ({readyCount})
                                </span>
                            )}
                        </button>
                    )}
                    <button
                        onClick={onReset}
                        className="px-3 py-2 rounded-xl text-sm transition-all duration-200"
                        style={{
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.4)',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>

            {/* ── Table ── */}
            <div
                className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
                                {['', 'File', 'Merchant', 'Date', 'Amount', 'Currency', 'Category', 'Status'].map((h, i) => (
                                    <th
                                        key={i}
                                        className="text-left px-4 py-3"
                                        style={{
                                            fontSize: '0.68rem',
                                            fontWeight: 700,
                                            letterSpacing: '0.07em',
                                            textTransform: 'uppercase',
                                            color: 'rgba(255,255,255,0.3)',
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => {
                                const editable = item.status === 'ready';
                                const isEven = idx % 2 === 0;
                                return (
                                    <tr
                                        key={item.id}
                                        style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            background: item.status === 'error'
                                                ? 'rgba(239,68,68,0.04)'
                                                : item.status === 'saved'
                                                    ? 'rgba(34,197,94,0.02)'
                                                    : isEven
                                                        ? 'rgba(255,255,255,0.015)'
                                                        : 'transparent',
                                            opacity: item.status === 'saved' ? 0.65 : 1,
                                            transition: 'opacity 0.3s, background 0.3s',
                                        }}
                                    >
                                        {/* Row number */}
                                        <td className="px-4 py-3">
                                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', fontVariantNumeric: 'tabular-nums' }}>
                                                {String(idx + 1).padStart(2, '0')}
                                            </span>
                                        </td>

                                        {/* File name */}
                                        <td className="px-3 py-3 max-w-[120px]">
                                            <span
                                                className="block truncate"
                                                title={item.file.name}
                                                style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}
                                            >
                                                {item.file.name}
                                            </span>
                                        </td>

                                        {/* Vendor */}
                                        <td className="px-3 py-3">
                                            <input
                                                type="text"
                                                value={item.formData.vendor}
                                                disabled={!editable}
                                                onChange={e => onUpdate(item.id, 'vendor', e.target.value)}
                                                style={editable ? cellInput : cellInputDisabled}
                                                placeholder="Merchant"
                                                className="min-w-[110px] rounded-md focus:bg-white/5 px-1 transition-all"
                                            />
                                        </td>

                                        {/* Date */}
                                        <td className="px-3 py-3">
                                            <input
                                                type="date"
                                                value={item.formData.date}
                                                disabled={!editable}
                                                onChange={e => onUpdate(item.id, 'date', e.target.value)}
                                                style={editable ? cellInput : cellInputDisabled}
                                                className="rounded-md focus:bg-white/5 px-1 transition-all"
                                            />
                                        </td>

                                        {/* Amount */}
                                        <td className="px-3 py-3">
                                            <input
                                                type="number"
                                                value={item.formData.amount}
                                                disabled={!editable}
                                                onChange={e => onUpdate(item.id, 'amount', Number(e.target.value))}
                                                style={{ ...editable ? cellInput : cellInputDisabled, width: '6rem' }}
                                                className="rounded-md focus:bg-white/5 px-1 transition-all"
                                            />
                                        </td>

                                        {/* Currency */}
                                        <td className="px-3 py-3">
                                            <select
                                                value={item.formData.currency}
                                                disabled={!editable}
                                                onChange={e => onUpdate(item.id, 'currency', e.target.value)}
                                                style={editable ? cellInput : cellInputDisabled}
                                                className="rounded-md focus:bg-white/5 transition-all"
                                            >
                                                {['JPY', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CNY', 'KRW'].map(c => (
                                                    <option key={c} value={c} className="bg-slate-900">{c}</option>
                                                ))}
                                            </select>
                                        </td>

                                        {/* Category */}
                                        <td className="px-3 py-3">
                                            <select
                                                value={item.formData.category}
                                                disabled={!editable}
                                                onChange={e => onUpdate(item.id, 'category', e.target.value)}
                                                style={{ ...editable ? cellInput : cellInputDisabled, fontSize: '0.75rem' }}
                                                className="rounded-md focus:bg-white/5 transition-all"
                                            >
                                                {CATEGORIES.map(c => (
                                                    <option key={c} value={c} className="bg-slate-900">{c}</option>
                                                ))}
                                            </select>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            {item.status === 'saved' && item.result ? (
                                                <a
                                                    href={item.result.driveWebViewLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs font-medium transition-colors"
                                                    style={{ color: '#4ade80' }}
                                                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                                                >
                                                    <StatusBadge status={item.status} />
                                                </a>
                                            ) : (
                                                <StatusBadge status={item.status} />
                                            )}
                                            {item.status === 'error' && (
                                                <p className="text-xs mt-1" style={{ color: 'rgba(248,113,113,0.6)' }} title={item.error}>
                                                    {item.error?.slice(0, 20)}…
                                                </p>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── All done banner ── */}
            {allDone && savedCount > 0 && (
                <div
                    className="rounded-2xl px-6 py-4 flex items-center gap-4 fade-in-up"
                    style={{
                        background: 'rgba(34,197,94,0.07)',
                        border: '1px solid rgba(34,197,94,0.2)',
                        boxShadow: '0 0 40px rgba(34,197,94,0.06)',
                    }}
                >
                    <div
                        className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                        style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)' }}
                    >
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-green-400">All done! {savedCount} receipts saved.</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(34,197,94,0.5)' }}>
                            Check Google Drive and Sheets for your records.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
