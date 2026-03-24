import OpenAI from 'openai';

export interface ExtractedReceiptData {
    vendor: string;
    date: string;       // YYYY-MM-DD
    amount: number;
    currency: string;
    items: string;      // Comma-separated list of purchased items/descriptions
    receiptType: string; // e.g. "飲食", "交通", "印刷_証明書", "消耗品", "宿泊"
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
        return { vendor: '', date: '', amount: 0, currency: 'JPY', items: '', receiptType: '', rawText: '' };
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

    const prompt = `あなたはレシートOCRの専門家です。以下のレシート画像を詳しく分析してください。
JSONのみで返答してください（説明は不要）:
{
  "vendor": "店舗名・会社名",
  "date": "YYYY-MM-DD形式の日付",
  "amount": 合計金額を数値で（円記号・カンマなし）,
  "currency": "3文字の通貨コード（日本は JPY）",
  "items": "購入した商品・サービスの名称（カンマ区切り）。例: コーヒー,サンドウィッチ / プリント代,証明書発行 / タクシー代 / 消耗品 / 電気料金 / 事務手数料",
  "receiptType": "レシートの種類を以下から1つ選択: 飲食/交通/宿泊/コンビニ購入/印刷_証明書/医療/通信/消耗品/書籍/研修_セミナー/水道光熱/家賃_駐車場/修繕/リース/諸会費/支払手数料/外注/租税公課/保険/その他"
}
重要なルール:
- 日本語レシートはデフォルトで JPY
- 合計/合計金額/請求金額のみを amount に
- 和暦（令和・平成・R6等）はYYYY-MM-DDに変換
- items は必ずレシートに書かれた商品名・サービス名を全て抜き出すこと（コンビニ・レストランは特に重要）
- 見つからない場合は空文字か0を返す`;

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
            max_tokens: 400,
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
            items: parsed.items || '',
            receiptType: parsed.receiptType || '',
            rawText: text,
        };
    } catch (err) {
        console.error('[OCR] OpenAI error:', err);
        return { vendor: '', date: '', amount: 0, currency: 'JPY', items: '', receiptType: '', rawText: '' };
    }
}
