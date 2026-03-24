"use client";

import { useState } from "react";
import { FileSpreadsheet, FolderOpen, Pencil, Check, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/your-sheet-id/edit";
const DEFAULT_DRIVE_URL = "https://drive.google.com/drive/folders/your-folder-id";

interface DestinationFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  defaultValue: string;
  placeholder: string;
  onChange: (value: string) => void;
}

function DestinationField({
  icon,
  label,
  value,
  defaultValue,
  placeholder,
  onChange,
}: DestinationFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const isDefault = value === defaultValue;

  const handleEdit = () => {
    setDraft(value);
    setEditing(true);
  };

  const handleSave = () => {
    const trimmed = draft.trim();
    onChange(trimmed || defaultValue);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const handleReset = () => {
    onChange(defaultValue);
    setDraft(defaultValue);
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {icon}
        {label}
      </Label>

      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="h-8 font-mono text-xs flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-success hover:text-success"
            onClick={handleSave}
            aria-label="Save"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={handleCancel}
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex flex-1 items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-mono truncate",
              isDefault
                ? "border-dashed border-border bg-muted/50 text-muted-foreground"
                : "border-border bg-card text-foreground"
            )}
          >
            <span className="truncate">{value}</span>
            {!isDefault && (
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto shrink-0 text-muted-foreground hover:text-primary"
                aria-label="Open in new tab"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={handleEdit}
            aria-label={`Edit ${label}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {!isDefault && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 shrink-0 text-xs text-muted-foreground hover:text-foreground px-2"
              onClick={handleReset}
            >
              Reset
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface DestinationsPanelProps {
  sheetUrl: string;
  driveUrl: string;
  onSheetUrlChange: (url: string) => void;
  onDriveUrlChange: (url: string) => void;
}

export function DestinationsPanel({
  sheetUrl,
  driveUrl,
  onSheetUrlChange,
  onDriveUrlChange,
}: DestinationsPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Destinations</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Set where extracted data and renamed images are saved.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DestinationField
          icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
          label="Google Sheet URL"
          value={sheetUrl}
          defaultValue={DEFAULT_SHEET_URL}
          placeholder="https://docs.google.com/spreadsheets/d/..."
          onChange={onSheetUrlChange}
        />
        <DestinationField
          icon={<FolderOpen className="h-3.5 w-3.5" />}
          label="Google Drive Folder URL"
          value={driveUrl}
          defaultValue={DEFAULT_DRIVE_URL}
          placeholder="https://drive.google.com/drive/folders/..."
          onChange={onDriveUrlChange}
        />
      </div>
    </div>
  );
}

export { DEFAULT_SHEET_URL, DEFAULT_DRIVE_URL };
