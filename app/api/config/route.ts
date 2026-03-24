import { NextResponse } from 'next/server';

/**
 * Exposes safe, non-secret default configuration values to the client,
 * so the UI can display clickable links to the default Google Sheet and Drive folder.
 */
export async function GET() {
    return NextResponse.json({
        defaultSheetId: process.env.GOOGLE_SPREADSHEET_ID ?? '',
        defaultFolderName: 'ReceiptAutomation',
    });
}
