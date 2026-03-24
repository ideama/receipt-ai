import OpenAI from 'openai';

export interface ExtractedReceiptData {
    vendor: string;
    date: string;       // YYYY-MM-DD
    amount: number;
    currency: string;
    rawText: string;
}

/**
 * Extract receipt data using OpenAI GPT-4o Vision.
 * Requires OPENAI_API_KEY in environment variables.
 */
export async function extractReceiptData(
    fileBuffer: Buffer,
    mimeType: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _accessToken?: string,
    fileName?: string
): Promise<ExtractedReceiptData> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.warn('[OCR] OPENAI_API_KEY not set — skipping OCR');
        return { vendor: '', date: '', amount: 0, currency: 'JPY', rawText: '' };
    }

    const isPdf = mimeType === 'application/pdf';

    // Detect HEIC by MIME type OR file extension (browsers sometimes report HEIC as octet-stream)
    const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
    const isHEICByExt = ext === 'heic' || ext === 'heif';
    const isHEICByMime = mimeType === 'image/heic' || mimeType === 'image/heif';

    let processedBuffer = fileBuffer;
    let imageType = 'image/jpeg';

    if (isPdf) {
        // For PDFs, send PDF data directly to GPT-4o (it can read them via base64)
        imageType = 'application/pdf';
        processedBuffer = fileBuffer;
    } else {
        // For all images (HEIC, JPEG, PNG etc.), normalize to JPEG via sharp
        // This is the most reliable strategy across all serverless environments
        try {
            const sharp = (await import('sharp')).default;
            if (isHEICByMime || isHEICByExt) {
                // For HEIC, use the raw buffer input — sharp auto-detects format from magic bytes
                processedBuffer = await sharp(fileBuffer, { failOnError: false })
                    .jpeg({ quality: 90 })
                    .toBuffer();
                console.log('[OCR] HEIC→JPEG via sharp, output size:', processedBuffer.length);
            } else {
                // For other images, still normalize to JPEG for consistent quality
                processedBuffer = await sharp(fileBuffer, { failOnError: false })
                    .jpeg({ quality: 90 })
                    .toBuffer();
                console.log('[OCR] Image normalized to JPEG via sharp');
            }
            imageType = 'image/jpeg';
        } catch (convErr) {
            console.warn('[OCR] sharp conversion failed, using raw buffer:', convErr);
            // Fall back to sending raw buffer — label as JPEG as last resort
            imageType = isHEICByMime || isHEICByExt ? 'image/jpeg' : (mimeType || 'image/jpeg');
        }
    }

    const base64 = processedBuffer.toString('base64');
    const dataUrl = `data:${imageType};base64,${base64}`;


    const client = new OpenAI({ apiKey });

    const prompt = `You are a receipt OCR assistant. Analyze this receipt image and extract the following fields.
Return ONLY a valid JSON object with these exact keys, nothing else:
{
  "vendor": "store or company name",
  "date": "date in YYYY-MM-DD format",
  "amount": total amount as a plain number (no commas or symbols),
  "currency": "3-letter code: JPY, USD, EUR etc."
}
Rules:
- Default currency to JPY for Japanese receipts
- Extract the TOTAL/合計 amount only
- Convert Japanese dates (令和, 年月日, R6 etc.) to YYYY-MM-DD
- Return empty string or 0 if a field cannot be found`;

    try {
        const response = await client.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
                    ],
                },
            ],
            max_tokens: 200,
        });

        const text = response.choices[0]?.message?.content?.trim() || '';
        console.log('[OCR] GPT-4o response:', text);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in response: ' + text);
        const parsed = JSON.parse(jsonMatch[0]);

        return {
            vendor: parsed.vendor || '',
            date: parsed.date || '',
            amount: Number(parsed.amount) || 0,
            currency: parsed.currency || 'JPY',
            rawText: text,
        };
    } catch (err) {
        console.error('[OCR] OpenAI error:', err);
        return { vendor: '', date: '', amount: 0, currency: 'JPY', rawText: '' };
    }
}
