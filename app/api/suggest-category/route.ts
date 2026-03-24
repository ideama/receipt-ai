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
    const { vendor, amount, currentCategory, description } = await req.json();
    const amountNum = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;

    const prompt = `あなたは日本の確定申告の仕訳の専門家です。
以下のレシート情報を分析し、最適な仕訳カテゴリーを提案してください。

レシート情報:
- 店舗名: ${vendor}
- 金額: ¥${amountNum.toLocaleString()}
- 現在のカテゴリー: ${currentCategory}

利用可能なカテゴリー（日本語名 - 説明の順）:
${CATEGORY_RULES.map(c => `- ${c.name}: ${c.description}`).join('\n')}

重要なルール:
1. 飲食店で¥5,000を超える場合、「会議費」ではなく「接待交際費」が適切
2. 交通機関（電車、タクシー、飛行機）は「旅費交通費」
3. 通信・ソフトウェア・サブスクリプションは「通信費」
4. コーヒーや軽い打合せ飲食（¥5,000未満）は「会議費」でOK

JSONのみで回答してください（説明不要）:
{
  "suggestedCategory": "最適なカテゴリー名",
  "defaultDescription": "この費用の一般的な説明（日本語、20文字以内）",
  "reason": "なぜこのカテゴリーを勧めるか（日本語、30文字以内）",
  "shouldChange": true または false（現在のカテゴリーから変更すべきか）
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
      defaultDescription: result.defaultDescription || description || '',
      reason: result.reason || '',
      shouldChange: result.shouldChange ?? false,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
