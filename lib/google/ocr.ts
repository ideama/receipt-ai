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
    _accessToken?: string
): Promise<ExtractedReceiptData> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.warn('[OCR] OPENAI_API_KEY not set — skipping OCR');
        return { vendor: '', date: '', amount: 0, currency: 'JPY', rawText: '' };
    }

    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const isHEIC = mimeType === 'image/heic' || mimeType === 'image/heif';

    let processedBuffer = fileBuffer;
    let imageType = mimeType;

    if (isHEIC) {
        try {
            // sharp is bundled with Next.js/Vercel and reliably handles HEIC on serverless
            const sharp = (await import('sharp')).default;
            const converted = await sharp(fileBuffer).jpeg({ quality: 92 }).toBuffer();
            processedBuffer = converted;
            imageType = 'image/jpeg';
            console.log('[OCR] HEIC→JPEG via sharp, size:', processedBuffer.length);
        } catch (convErr) {
            console.warn('[OCR] sharp HEIC conversion failed:', convErr);
            // Fallback: still try as JPEG (last resort)
            imageType = 'image/jpeg';
        }
    } else {
        imageType = supportedTypes.includes(mimeType) ? mimeType : 'image/jpeg';
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
