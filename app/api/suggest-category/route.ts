import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Expanded Japanese accounting categories list (19 categories)

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
- 消耗品費: 業務用消耗品・文具・10万円未満の備品
- 会議費: コーヒー・軽食での打合せ（1人5,000円以下の飲食）
- 接待交際費: 取引先との飲食・接待（1人5,000円超の飲食店）
- 旅費交通費: 電車・タクシー・飛行機・ホテル・ガソリン代
- 通信費: 電話・インターネット回線・切手代・ソフトウェア
- 水道光熱費: 電気・ガス・水道の料金
- 地代家賃: オフィス・店舗・駐車場などの賃料・コワーキングスペース
- 広告宣伝費: Web広告・SNSマーケティング費用
- 新聞図書費: 書籍・新聞・雑誌
- 研修費: セミナー・研修参加費
- 荷造運賃: 郵便局での商品発送・ゆうパック・宅配便
- 修繕費: パソコンや備品、店舗などの修理代
- リース料: 業務用のコピー機や車両などのリース代
- 諸会費: 業務関連団体や同業組合などの会費
- 支払手数料: 銀行振込手数料や各種代行手数料
- 外注業務費: 外部業者・フリーランスへの業務委託費
- 租税公課: 収入印紙や事業税、公的な各種証明書の発行手数料
- 保険料: 事業用損害保険・自動車保険などの保険料
- 雑費: プリント代・その他少額のコンビニサービス（上記以外）

【重要な判断ルール】:
1. ガス・電気・水道代 →「水道光熱費」
2. 銀行送金手数料、決済手数料 →「支払手数料」
3. 家賃、駐車場代、レンタルオフィス代 →「地代家賃」
4. 収入印紙、役所での公的な証明書発行 →「租税公課」
5. 単なるプリント代・コピー代 →「雑費」
6. コンビニで食品以外（日用品・雑貨） →「消耗品費」
7. 飲食店で接待（5000円超など） →「接待交際費」、カフェや軽食 →「会議費」
8. 郵便局での商品発送（ゆうパック等）→「荷造運賃」、書類送付（レターパック等）→「通信費」

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
