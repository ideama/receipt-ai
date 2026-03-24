"use client";

import { useCallback, useState } from "react";
import { Upload, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function UploadZone({ onFilesSelected, disabled }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith("image/")
    );
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [disabled, onFilesSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    e.target.value = "";
  }, [onFilesSelected]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200",
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-muted-foreground/50",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <div className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
          isDragOver ? "bg-primary/10" : "bg-muted"
        )}>
          {isDragOver ? (
            <ImagePlus className="h-7 w-7 text-primary" />
          ) : (
            <Upload className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-base font-medium text-foreground">
            {isDragOver ? "Drop your receipts here" : "Drag and drop receipts"}
          </p>
          <p className="text-sm text-muted-foreground">
            or click to browse files
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild disabled={disabled}>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInput}
                className="sr-only"
                disabled={disabled}
              />
              Upload Receipt
            </label>
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Supports JPG, PNG, WEBP. Upload one or multiple receipt images.
        </p>
      </div>
    </div>
  );
}
