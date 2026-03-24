import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const DRIVE_ROOT_FOLDER_NAME = 'ReceiptAutomation';

/**
 * Build an OAuth2 client from the user's access token.
 */
export function getOAuth2Client(accessToken: string): OAuth2Client {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ access_token: accessToken });
    return oauth2Client;
}

/**
 * Find or create a folder inside parentId with the given name.
 */
async function findOrCreateFolder(
    drive: ReturnType<typeof google.drive>,
    name: string,
    parentId: string
): Promise<string> {
    const res = await drive.files.list({
        q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
        fields: 'files(id, name)',
    });
    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id!;
    }
    const created = await drive.files.create({
        requestBody: {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
        },
        fields: 'id',
    });
    return created.data.id!;
}

/**
 * Get or create the YYYY/MM folder path under ReceiptAutomation root.
 * Returns the folder ID for the target month folder.
 */
export async function getOrCreateDateFolder(
    accessToken: string,
    year: string,
    month: string,
    baseFolderName?: string
): Promise<string> {
    const rootName = baseFolderName || DRIVE_ROOT_FOLDER_NAME;
    const oauth2Client = getOAuth2Client(accessToken);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Root folder
    const rootRes = await drive.files.list({
        q: `name='${rootName}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`,
        fields: 'files(id)',
    });
    let rootId: string;
    if (rootRes.data.files && rootRes.data.files.length > 0) {
        rootId = rootRes.data.files[0].id!;
    } else {
        const created = await drive.files.create({
            requestBody: {
                name: rootName,
                mimeType: 'application/vnd.google-apps.folder',
            },
            fields: 'id',
        });
        rootId = created.data.id!;
    }

    const yearId = await findOrCreateFolder(drive, year, rootId);
    const monthId = await findOrCreateFolder(drive, month, yearId);
    return monthId;
}

/**
 * Check if a file with the given name already exists in the folder.
 */
export async function checkDuplicate(
    accessToken: string,
    folderId: string,
    fileName: string
): Promise<boolean> {
    const oauth2Client = getOAuth2Client(accessToken);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const res = await drive.files.list({
        q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id)',
    });
    return !!(res.data.files && res.data.files.length > 0);
}

/**
 * Upload a file buffer to Drive in the specified folder.
 * Returns the Drive file ID and web view link.
 */
export async function uploadFileToDrive(
    accessToken: string,
    folderId: string,
    fileName: string,
    mimeType: string,
    buffer: Buffer
): Promise<{ fileId: string; webViewLink: string }> {
    const oauth2Client = getOAuth2Client(accessToken);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const { Readable } = await import('stream');
    const stream = Readable.from(buffer);

    const res = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [folderId],
        },
        media: {
            mimeType,
            body: stream,
        },
        fields: 'id, webViewLink',
    });

    return {
        fileId: res.data.id!,
        webViewLink: res.data.webViewLink || '',
    };
}
