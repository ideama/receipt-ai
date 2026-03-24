'use client';

import { useCallback, useState } from 'react';

interface UploadAreaProps {
    onFilesSelected: (files: File[]) => void;
    isLoading: boolean;
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf'];

const FORMAT_TAGS = ['JPG', 'PNG', 'HEIC', 'PDF'];

export default function UploadArea({ onFilesSelected, isLoading }: UploadAreaProps) {
    const [dragging, setDragging] = useState(false);

    const processFiles = useCallback(
        (fileList: FileList | null) => {
            if (!fileList) return;
            const valid = Array.from(fileList).filter((f) => ALLOWED.includes(f.type));
            if (valid.length > 0) {
                // Yield the main thread to allow the browser to paint the interaction immediately (Fixes INP)
                setTimeout(() => {
                    onFilesSelected(valid);
                }, 0);
            }
        },
        [onFilesSelected]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setDragging(false);
            processFiles(e.dataTransfer.files);
        },
        [processFiles]
    );

    return (
        <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            style={{
                borderRadius: '1.25rem',
                padding: '1px',
                background: dragging
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa)'
                    : 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))',
                transition: 'background 0.3s ease',
                position: 'relative',
            }}
        >
            <div
                className={`relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                    isLoading ? 'opacity-60 pointer-events-none' : ''
                }`}
                style={{
                    borderRadius: '1.2rem',
                    padding: '3.5rem 2rem',
                    background: dragging
                        ? 'rgba(99,102,241,0.08)'
                        : 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(8px)',
                }}
            >
                {/* Hidden file input covers the whole zone */}
                <input
                    id="file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/heic,image/heif,application/pdf"
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => processFiles(e.target.files)}
                    disabled={isLoading}
                />

                {/* Icon with glow ring */}
                <div
                    className="mb-5 relative"
                    style={{
                        width: '5rem',
                        height: '5rem',
                        borderRadius: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: dragging
                            ? 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))'
                            : 'rgba(99,102,241,0.12)',
                        border: '1px solid rgba(139,92,246,0.25)',
                        transition: 'all 0.3s ease',
                        animation: dragging ? 'pulse-glow 1.5s ease-in-out infinite' : 'none',
                    }}
                >
                    <svg
                        className="transition-transform duration-300"
                        style={{
                            width: '36px', height: '36px', flexShrink: 0,
                            color: dragging ? '#a78bfa' : '#818cf8',
                            transform: dragging ? 'translateY(-3px)' : 'none',
                        }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                </div>

                {/* Text */}
                <p className="text-base font-semibold text-white mb-1.5">
                    {dragging ? 'Drop receipts here!' : 'Drag & drop receipts'}
                </p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    or{' '}
                    <span style={{ color: '#a78bfa', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                        browse files
                    </span>
                </p>

                {/* Format badges */}
                <div className="flex gap-2 mt-5">
                    {FORMAT_TAGS.map(tag => (
                        <span
                            key={tag}
                            style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                letterSpacing: '0.05em',
                                color: 'rgba(255,255,255,0.35)',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '0.4rem',
                                padding: '0.2rem 0.55rem',
                            }}
                        >
                            {tag}
                        </span>
                    ))}
                    <span
                        style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.25)',
                            padding: '0.2rem 0rem',
                        }}
                    >
                        · Multiple files supported
                    </span>
                </div>

                {/* Loading overlay */}
                {isLoading && (
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center rounded-[1.2rem]"
                        style={{ background: 'rgba(8,8,26,0.7)', backdropFilter: 'blur(4px)' }}
                    >
                        <div
                            className="w-10 h-10 rounded-full border-2 animate-spin mb-3"
                            style={{
                                borderColor: 'rgba(139,92,246,0.2)',
                                borderTopColor: '#8b5cf6',
                            }}
                        />
                        <p className="text-sm font-medium" style={{ color: 'rgba(167,139,250,0.8)' }}>
                            Extracting data…
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                            AI is reading your receipt
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
