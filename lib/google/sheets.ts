import { google } from 'googleapis';
import { getOAuth2Client } from './drive';

export interface ReceiptRow {
    receiptId: string;
    date: string;          // YYYY-MM-DD
    vendor: string;
    amount: number;
    currency: string;
    category: string;
    description: string;
    driveFileId: string;
    driveWebViewLink: string;
    uploadedAt: string;    // ISO timestamp
}

const SHEET_NAME = 'Receipts';
const HEADER_ROW = [
    'receipt_id',
    'date',
    'vendor',
    'amount',
    'currency',
    'category',
    'description',
    'drive_file_id',
    'drive_web_view_link',
    'uploaded_at',
];

/**
 * Ensure the sheet header row exists; create sheet tab if needed.
 */
async function ensureHeaderRow(
    sheets: ReturnType<typeof google.sheets>,
    spreadsheetId: string
) {
    // Check if Receipts sheet exists
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetNames = (meta.data.sheets || []).map(
        (s) => s.properties?.title
    );

    if (!sheetNames.includes(SHEET_NAME)) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        addSheet: {
                            properties: { title: SHEET_NAME },
                        },
                    },
                ],
            },
        });
    }

    // Check if header row exists
    const headerRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAME}!A1:J1`,
    });

    if (!headerRes.data.values || headerRes.data.values.length === 0) {
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${SHEET_NAME}!A1`,
            valueInputOption: 'RAW',
            requestBody: { values: [HEADER_ROW] },
        });
    }
}

/**
 * Check if a receipt_id already exists in the sheet.
 */
export async function checkDuplicateInSheet(
    accessToken: string,
    spreadsheetId: string,
    receiptId: string
): Promise<boolean> {
    const oauth2Client = getOAuth2Client(accessToken);
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // Ensure sheet tab exists before reading from it
    await ensureHeaderRow(sheets, spreadsheetId);

    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${SHEET_NAME}!A:A`,
        });
        const values = res.data.values || [];
        return values.some((row) => row[0] === receiptId);
    } catch {
        // Sheet might be empty or range invalid — treat as no duplicate
        return false;
    }
}

/**
 * Append a receipt row to the Sheets spreadsheet.
 */
export async function appendReceiptRow(
    accessToken: string,
    spreadsheetId: string,
    row: ReceiptRow
): Promise<void> {
    const oauth2Client = getOAuth2Client(accessToken);
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    await ensureHeaderRow(sheets, spreadsheetId);

    const values = [
        [
            row.receiptId,
            row.date,
            row.vendor,
            row.amount,
            row.currency,
            row.category,
            row.description,
            row.driveFileId,
            row.driveWebViewLink,
            row.uploadedAt,
        ],
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
    });
}
