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

    let imageType = mimeType;
    if (isPdf) {
        imageType = 'application/pdf';
    } else {
        // Fallback for browsers passing octet-stream for images
        const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
        if (ext === 'jpg' || ext === 'jpeg') imageType = 'image/jpeg';
        else if (ext === 'png') imageType = 'image/png';
        else if (!mimeType || mimeType === 'application/octet-stream') imageType = 'image/jpeg';
    }

    const base64 = fileBuffer.toString('base64');
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
