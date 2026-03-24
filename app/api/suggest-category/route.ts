import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Japanese accounting categories with rules and default descriptions
export const CATEGORY_RULES = [
  { name: '会議費', description: '社内会議・打合せ', threshold: 5000, type: ['coffee', 'small restaurant', 'meeting room', 'cafe'] },
  { name: '接待交際費', description: '取引先・インフルエンサー接待', type: ['restaurant', 'bar', 'entertainment'] },
  { name: '旅費交通費', description: '業務出張・交通費', type: ['transport', 'hotel', 'train', 'taxi', 'flight'] },
  { name: '通信費', description: '業務用通信費・インターネット', type: ['phone', 'internet', 'communication', 'software'] },
  { name: '消耗品費', description: '業務用消耗品・文房具', type: ['supplies', 'stationery', 'office'] },
  { name: '広告宣伝費', description: 'SNS広告・マーケティング費', type: ['advertising', 'marketing'] },
  { name: '新聞図書費', description: '業務用書籍・新聞', type: ['books', 'newspaper', 'magazine'] },
  { name: '研修費', description: '業務研修・セミナー参加', type: ['education', 'seminar', 'training'] },
  { name: '雑費', description: 'その他の業務費用', type: ['other'] },
];

export async function POST(req: NextRequest) {
  try {
    const { vendor, amount, currentCategory, items, receiptType } = await req.json();
    const amountNum = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;

    const prompt = `あなたは日本の確定申告の仕訳の専門家です。
以下のレシート情報を分析し、最適な仕訳カテゴリーを提案してください。

レシート情報:
- 店舗名: ${vendor}
- 金額: ¥${amountNum.toLocaleString()}
- 購入品目: ${items || '不明'}
- レシート種類: ${receiptType || '不明'}
- 現在のカテゴリー: ${currentCategory}

利用可能なカテゴリー:
- 会議費: コーヒー・軽食での打合せ（¥5,000未満の飲食）
- 接待交際費: 取引先との飲食・接待（¥5,000以上の飲食店）
- 旅費交通費: 電車・タクシー・飛行機・ホテル
- 通信費: 電話・インターネット・ソフトウェア
- 消耗品費: 文房具・オフィス用品・コンビニ日用品
- 広告宣伝費: 広告・マーケティング費用
- 新聞図書費: 書籍・新聞・雑誌
- 研修費: セミナー・研修参加費
- 雑費: プリント代・証明書発行・その他コンビニサービス

【重要な判断ルール】:
1. 「プリント代」「印刷」「証明書」「コピー代」→「雑費」
2. コンビニで食品以外（日用品・雑貨）→「消耗品費」
3. 飲食店で¥5,000超 →「接待交際費」、¥5,000未満 →「会議費」
4. タクシー・電車・飛行機・ホテル →「旅費交通費」
5. 書籍・雑誌 →「新聞図書費」

JSONのみで回答（説明不要）:
{
  "suggestedCategory": "最適なカテゴリー名",
  "defaultDescription": "この費用の一般的な説明（日本語、25文字以内）",
  "reason": "なぜこのカテゴリーか（日本語、30文字以内）",
  "shouldChange": true または false
}`;

    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 200,
    });

    const result = JSON.parse(res.choices[0].message.content || '{}');

    return NextResponse.json({
      suggestedCategory: result.suggestedCategory || currentCategory,
      defaultDescription: result.defaultDescription || '',
      reason: result.reason || '',
      shouldChange: result.shouldChange ?? false,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
