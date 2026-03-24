"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Pencil, Trash2, Save, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ReceiptStatus = "processing" | "ready" | "saved" | "error";

export interface ReceiptData {
  id: string;
  imageUrl: string;
  merchantName: string;
  totalAmount: string;
  date: string;
  category: string;
  description: string;
  confidence: number;
  status: ReceiptStatus;
  errorMsg?: string;
}

export const JP_CATEGORIES = [
  "消耗品費",
  "会議費",
  "接待交際費",
  "旅費交通費",
  "通信費",
  "水道光熱費",
  "地代家賃",
  "広告宣伝費",
  "新聞図書費",
  "研修費",
  "荷造運賃",
  "修繕費",
  "リース料",
  "諸会費",
  "支払手数料",
  "外注業務費",
  "租税公課",
  "保険料",
  "雑費",
];

// Default descriptions per category
const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  消耗品費: "業務用消耗品・文具など",
  会議費: "社内・社外の打合せ費用（1人5000円以下）",
  接待交際費: "取引先との飲食・接待（1人5000円超）",
  旅費交通費: "業務に伴う移動・宿泊費",
  通信費: "インターネット・電話回線・切手代など",
  水道光熱費: "電気・ガス・水道の料金",
  地代家賃: "オフィス・店舗・駐車場などの賃料",
  広告宣伝費: "SNS・Webなどの広告掲載費や販促費",
  新聞図書費: "業務関連の書籍・雑誌・新聞代",
  研修費: "業務に必要なセミナー・研修の参加費",
  荷造運賃: "商品・書類の発送費用（ゆうパック・宅配便）",
  修繕費: "パソコンや備品、店舗などの修理代",
  リース料: "業務用のコピー機や車両などのリース代",
  諸会費: "業務関連団体や同業組合などの会費",
  支払手数料: "銀行振込手数料や各種代行手数料",
  外注業務費: "外部業者・フリーランスへの業務委託費",
  租税公課: "収入印紙や事業税、固定資産税など",
  保険料: "事業用損害保険・自動車保険などの保険料",
  雑費: "上記のいずれにも該当しない少額の支払い",
};

interface CategorySuggestion {
  suggestedCategory: string;
  defaultDescription: string;
  reason: string;
  shouldChange: boolean;
}

interface ReceiptCardProps {
  receipt: ReceiptData;
  onUpdate: (id: string, data: Partial<ReceiptData>) => void;
  onDelete: (id: string) => void;
  onSave: (id: string) => void;
}

export function ReceiptCard({ receipt, onUpdate, onDelete, onSave }: ReceiptCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    merchantName: receipt.merchantName,
    totalAmount: receipt.totalAmount,
    date: receipt.date,
    category: receipt.category,
    description: receipt.description || DEFAULT_DESCRIPTIONS[receipt.category] || "",
  });
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionDismissed, setSuggestionDismissed] = useState(true); // AI already ran at upload time

  // Auto-fetch AI suggestion when receipt becomes ready
  useEffect(() => {
    if (receipt.status === "ready" && !suggestionDismissed && !suggestion) {
      fetchSuggestion();
    }
  }, [receipt.status]);

  // Auto-fill default description when category changes in edit mode
  useEffect(() => {
    if (isEditing && DEFAULT_DESCRIPTIONS[editData.category]) {
      setEditData(prev => ({
        ...prev,
        description: prev.description || DEFAULT_DESCRIPTIONS[prev.category] || "",
      }));
    }
  }, [editData.category, isEditing]);

  const fetchSuggestion = async () => {
    setIsSuggesting(true);
    try {
      const res = await fetch('/api/suggest-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor: receipt.merchantName,
          amount: receipt.totalAmount,
          currentCategory: receipt.category,
          description: receipt.description,
        }),
      });
      const data = await res.json();
      if (data.shouldChange) {
        setSuggestion(data);
      } else {
        // Even if no change, fill description if missing
        if (!receipt.description && data.defaultDescription) {
          onUpdate(receipt.id, { description: data.defaultDescription });
        }
        setSuggestionDismissed(true);
      }
    } catch {
      setSuggestionDismissed(true);
    } finally {
      setIsSuggesting(false);
    }
  };

  const acceptSuggestion = () => {
    if (!suggestion) return;
    onUpdate(receipt.id, {
      category: suggestion.suggestedCategory,
      description: suggestion.defaultDescription,
    });
    setEditData(prev => ({
      ...prev,
      category: suggestion.suggestedCategory,
      description: suggestion.defaultDescription,
    }));
    setSuggestion(null);
    setSuggestionDismissed(true);
  };

  const dismissSuggestion = () => {
    setSuggestion(null);
    setSuggestionDismissed(true);
    // Still set default description based on current category
    if (!receipt.description) {
      const desc = DEFAULT_DESCRIPTIONS[receipt.category] || "";
      onUpdate(receipt.id, { description: desc });
      setEditData(prev => ({ ...prev, description: desc }));
    }
  };

  const handleSaveEdit = () => {
    onUpdate(receipt.id, editData);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditData({
      merchantName: receipt.merchantName,
      totalAmount: receipt.totalAmount,
      date: receipt.date,
      category: receipt.category,
      description: receipt.description || DEFAULT_DESCRIPTIONS[receipt.category] || "",
    });
    setIsEditing(false);
  };

  const statusConfig: Record<ReceiptStatus, { label: string; color: string }> = {
    processing: { label: "処理中", color: "bg-warning text-warning-foreground" },
    ready: { label: "確認待ち", color: "bg-primary text-primary-foreground" },
    saved: { label: "保存済み", color: "bg-success text-success-foreground" },
    error: { label: "エラー", color: "bg-destructive text-destructive-foreground" },
  };

  const status = statusConfig[receipt.status] || statusConfig.ready;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Image Preview */}
        <div className="relative h-48 w-full sm:h-auto sm:w-48 shrink-0 bg-muted">
          {receipt.status === "processing" ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <img
              src={receipt.imageUrl}
              alt="Receipt"
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          {/* Status & Confidence */}
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <Badge className={cn("text-xs w-fit", status.color)}>
                {receipt.status === "processing" && (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                )}
                {receipt.status === "saved" && (
                  <Check className="mr-1 h-3 w-3" />
                )}
                {status.label}
              </Badge>
              {receipt.status === "error" && receipt.errorMsg && (
                <p className="text-xs text-destructive/80 max-w-[200px] leading-tight">{receipt.errorMsg}</p>
              )}
            </div>

            {receipt.status !== "processing" && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>信頼度:</span>
                <span className={cn(
                  "font-medium",
                  receipt.confidence >= 90 ? "text-success" :
                  receipt.confidence >= 70 ? "text-warning" : "text-destructive"
                )}>
                  {receipt.confidence}%
                </span>
              </div>
            )}
          </div>

          {/* AI Category Suggestion Banner */}
          {isSuggesting && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse shrink-0" />
              <span className="text-xs text-muted-foreground">仕訳カテゴリーAI 分析中...</span>
            </div>
          )}

          {suggestion && !isSuggesting && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    🤖 仕訳カテゴリーAI の提案
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    「<span className="font-medium text-foreground">{suggestion.suggestedCategory}</span>」の方が適切です
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5 italic">
                    理由: {suggestion.reason}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1 bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={acceptSuggestion}
                    >
                      <Check className="h-3 w-3" />
                      はい、変更する
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={dismissSuggestion}
                    >
                      <X className="h-3 w-3" />
                      このままにする
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fields */}
          {receipt.status === "processing" ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">レシートを分析中...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 flex-1">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">店舗名</label>
                  {isEditing ? (
                    <Input
                      value={editData.merchantName}
                      onChange={(e) => setEditData({ ...editData, merchantName: e.target.value })}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <p className="text-sm font-medium text-foreground">{receipt.merchantName}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">金額</label>
                  {isEditing ? (
                    <Input
                      value={editData.totalAmount}
                      onChange={(e) => setEditData({ ...editData, totalAmount: e.target.value })}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <p className="text-sm font-medium text-foreground">{receipt.totalAmount}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">日付</label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editData.date}
                      onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <p className="text-sm font-medium text-foreground">{receipt.date}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    仕訳カテゴリー
                  </label>
                  {isEditing ? (
                    <Select
                      value={editData.category}
                      onValueChange={(value) => {
                        const desc = DEFAULT_DESCRIPTIONS[value] || "";
                        setEditData({ ...editData, category: value, description: editData.description || desc });
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JP_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium text-foreground">{receipt.category}</p>
                  )}
                </div>

                {/* Description - full width */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">摘要 / 説明</label>
                  {isEditing ? (
                    <Textarea
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      className="text-sm min-h-[54px] resize-none"
                      placeholder={DEFAULT_DESCRIPTIONS[editData.category] || "費用の説明を入力..."}
                    />
                  ) : (
                    <p className="text-sm text-foreground/80 leading-snug">
                      {receipt.description || DEFAULT_DESCRIPTIONS[receipt.category] || "-"}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                {isEditing ? (
                  <>
                    <Button size="sm" onClick={handleSaveEdit} className="gap-1">
                      <Save className="h-3 w-3" />
                      保存
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEdit} className="gap-1">
                      <X className="h-3 w-3" />
                      キャンセル
                    </Button>
                  </>
                ) : (
                  <>
                    {receipt.status !== "saved" && (
                      <Button size="sm" onClick={() => onSave(receipt.id)} className="gap-1">
                        <Check className="h-3 w-3" />
                        Sheetsへ保存
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditData({
                        merchantName: receipt.merchantName,
                        totalAmount: receipt.totalAmount,
                        date: receipt.date,
                        category: receipt.category,
                        description: receipt.description || DEFAULT_DESCRIPTIONS[receipt.category] || "",
                      });
                      setIsEditing(true);
                    }} className="gap-1">
                      <Pencil className="h-3 w-3" />
                      編集
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDelete(receipt.id)}
                      className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-3 w-3" />
                      削除
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
