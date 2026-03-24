"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export type ReceiptStatus = "processing" | "ready" | "saved";

export interface ReceiptData {
  id: string;
  imageUrl: string;
  merchantName: string;
  totalAmount: string;
  date: string;
  category: string;
  confidence: number;
  status: ReceiptStatus;
}

const CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Utilities",
  "Healthcare",
  "Travel",
  "Office Supplies",
  "Other",
];

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
  });

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
    });
    setIsEditing(false);
  };

  const statusConfig = {
    processing: { label: "Processing", color: "bg-warning text-warning-foreground" },
    ready: { label: "Ready", color: "bg-primary text-primary-foreground" },
    saved: { label: "Saved", color: "bg-success text-success-foreground" },
  };

  const status = statusConfig[receipt.status];

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
          <div className="mb-3 flex items-center justify-between">
            <Badge className={cn("text-xs", status.color)}>
              {receipt.status === "processing" && (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              )}
              {receipt.status === "saved" && (
                <Check className="mr-1 h-3 w-3" />
              )}
              {status.label}
            </Badge>
            
            {receipt.status !== "processing" && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>AI Confidence:</span>
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

          {receipt.status === "processing" ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">Analyzing receipt...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 flex-1">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Merchant Name
                  </label>
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
                  <label className="text-xs font-medium text-muted-foreground">
                    Total Amount
                  </label>
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
                  <label className="text-xs font-medium text-muted-foreground">
                    Date
                  </label>
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
                    Category
                  </label>
                  {isEditing ? (
                    <Select
                      value={editData.category}
                      onValueChange={(value) => setEditData({ ...editData, category: value })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
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
              </div>

              <div className="mt-4 flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button size="sm" onClick={handleSaveEdit} className="gap-1">
                      <Save className="h-3 w-3" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEdit} className="gap-1">
                      <X className="h-3 w-3" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    {receipt.status !== "saved" && (
                      <Button size="sm" onClick={() => onSave(receipt.id)} className="gap-1">
                        <Check className="h-3 w-3" />
                        Save to Sheets
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="gap-1">
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => onDelete(receipt.id)}
                      className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
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
