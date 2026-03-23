import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/components/SessionProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Receipt Automation | 確定申告用レシート管理',
    description:
        'Upload receipts, auto-save to Google Drive with naming conventions, and append to Google Sheets for tax purposes.',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'ReceiptAI',
    },
    icons: {
        apple: '/icons/icon-192x192.png',
    },
};

export const viewport: Viewport = {
    themeColor: '#0a0a1a',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ja">
            <body className={inter.className}>
                <SessionProvider>{children}</SessionProvider>
            </body>
        </html>
    );
}
