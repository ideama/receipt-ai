import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extractReceiptData } from '@/lib/google/ocr';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the OAuth access token to use for Vertex AI OCR
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = (session as any).accessToken as string | undefined;

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: `Unsupported file type: ${file.type}` },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const extracted = await extractReceiptData(buffer, file.type, accessToken || '');
        console.log('[upload] OCR result:', JSON.stringify(extracted));

        return NextResponse.json({
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            extracted,
        });
    } catch (err) {
        console.error('[upload] Error:', err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
