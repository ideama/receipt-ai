"use client";

import { Check, Loader2, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReceiptData } from "./receipt-card";

interface ReceiptsTableProps {
  receipts: ReceiptData[];
}

export function ReceiptsTable({ receipts }: ReceiptsTableProps) {
  if (receipts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No receipts uploaded yet. Upload your first receipt above.
        </p>
      </div>
    );
  }

  const statusConfig = {
    processing: { 
      label: "Processing", 
      color: "bg-warning text-warning-foreground",
      icon: Loader2 
    },
    ready: { 
      label: "Ready", 
      color: "bg-primary text-primary-foreground",
      icon: Clock 
    },
    saved: { 
      label: "Saved", 
      color: "bg-success text-success-foreground",
      icon: Check 
    },
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold">Merchant</TableHead>
            <TableHead className="font-semibold">Amount</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold">Category</TableHead>
            <TableHead className="font-semibold text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {receipts.map((receipt) => {
            const status = statusConfig[receipt.status];
            const StatusIcon = status.icon;
            return (
              <TableRow key={receipt.id}>
                <TableCell className="font-medium">
                  {receipt.status === "processing" ? (
                    <span className="text-muted-foreground">Analyzing...</span>
                  ) : (
                    receipt.merchantName
                  )}
                </TableCell>
                <TableCell>
                  {receipt.status === "processing" ? "-" : receipt.totalAmount}
                </TableCell>
                <TableCell>
                  {receipt.status === "processing" ? "-" : receipt.date}
                </TableCell>
                <TableCell>
                  {receipt.status === "processing" ? "-" : receipt.category}
                </TableCell>
                <TableCell className="text-right">
                  <Badge className={cn("text-xs", status.color)}>
                    <StatusIcon className={cn(
                      "mr-1 h-3 w-3",
                      receipt.status === "processing" && "animate-spin"
                    )} />
                    {status.label}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
