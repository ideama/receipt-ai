import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

import {
    getOrCreateDateFolder,
    checkDuplicate,
    uploadFileToDrive,
} from '@/lib/google/drive';
import { appendReceiptRow, checkDuplicateInSheet } from '@/lib/google/sheets';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = (session as any)?.accessToken as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokenError = (session as any)?.error;

    console.log('[save] session present:', !!session, '| token present:', !!accessToken, '| token error:', tokenError, '| token start:', accessToken?.slice(0, 20));

    if (!session || !accessToken) {
        return NextResponse.json({ error: 'Unauthorized — no session or token' }, { status: 401 });
    }

    const defaultSpreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    if (!defaultSpreadsheetId) {
        return NextResponse.json(
            { error: 'GOOGLE_SPREADSHEET_ID not configured' },
            { status: 500 }
        );
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const vendor = formData.get('vendor') as string;
        const date = formData.get('date') as string;          // YYYY-MM-DD
        const amount = parseFloat(formData.get('amount') as string);
        const currency = (formData.get('currency') as string) || 'JPY';
        const category = (formData.get('category') as string) || '';
        const description = (formData.get('description') as string) || '';
        // Custom destination overrides from the client UI
        const customSheetId = (formData.get('customSheetId') as string) || '';
        const customFolderName = (formData.get('customFolderName') as string) || '';
        const spreadsheetId = customSheetId || defaultSpreadsheetId;

        if (!file || !vendor || !date || isNaN(amount)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Parse date to get year/month for Drive folder
        const [year, month] = date.split('-');

        // Build canonical file name: YYYYMMDD_vendor_amountCurrency.ext
        const ext = file.name.split('.').pop() || 'jpg';
        const safeVendor = vendor.replace(/[^a-zA-Z0-9\u3000-\u9fff\u30a0-\u30ff\u3041-\u3096]/g, '_');
        const fileName = `${date.replace(/-/g, '')}_${safeVendor}_${amount}${currency}.${ext}`;

        // Generate or derive receipt_id based on file content hash
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const receiptId = uuidv4(); // deterministic would require hashing; use UUID for MVP

        // Get or create folder in Drive
        const folderId = await getOrCreateDateFolder(accessToken, year, month, customFolderName || undefined);

        // Duplicate check in Drive
        const driveHasDup = await checkDuplicate(accessToken, folderId, fileName);
        if (driveHasDup) {
            return NextResponse.json(
                { error: 'Duplicate: a file with this name already exists in Drive.' },
                { status: 409 }
            );
        }

        // Duplicate check in Sheets by receipt_id (skipped for UUID — file name based dup check is primary)
        const sheetHasDup = await checkDuplicateInSheet(accessToken, spreadsheetId, receiptId);
        if (sheetHasDup) {
            return NextResponse.json(
                { error: 'Duplicate: this receipt_id already exists in the spreadsheet.' },
                { status: 409 }
            );
        }

        // Upload to Drive
        const { fileId, webViewLink } = await uploadFileToDrive(
            accessToken,
            folderId,
            fileName,
            file.type,
            buffer
        );

        // Append to Sheets
        const uploadedAt = new Date().toISOString();
        await appendReceiptRow(accessToken, spreadsheetId, {
            receiptId,
            date,
            vendor,
            amount,
            currency,
            category,
            description,
            driveFileId: fileId,
            driveWebViewLink: webViewLink,
            uploadedAt,
        });

        return NextResponse.json({
            success: true,
            fileName,
            driveFileId: fileId,
            driveWebViewLink: webViewLink,
            receiptId,
        });
    } catch (err: unknown) {
        console.error('[save] Error:', err);
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
