import { useState, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  X,
  FileText,
  FileSpreadsheet,
  Image,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import type {
  AnalysisProgress,
  AnalysisMatch,
  AnalysisCompleteResult,
} from "@/hooks/useDocumentAnalysis";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

// Evidence types matching the backend enum
const EVIDENCE_TYPES = [
  { value: "POLICY", label: "Policy" },
  { value: "REGISTER", label: "Register" },
  { value: "RECORD", label: "Record" },
  { value: "MATRIX", label: "Matrix" },
  { value: "DOCUMENT", label: "Document" },
  { value: "OTHER", label: "Other" },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  if (mimeType.includes("word")) return <FileText className="h-4 w-4 text-blue-500" />;
  if (mimeType.includes("spreadsheet")) return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
  if (mimeType.startsWith("image/")) return <Image className="h-4 w-4 text-purple-500" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

/** Returns a human-readable label for the analysis phase */
function getPhaseLabel(phase: string): string {
  switch (phase) {
    case "extracting":
      return "Extracting text from document...";
    case "chunking":
      return "Preparing document for analysis...";
    case "analysing":
      return "Analysing with AI...";
    case "fusion":
      return "Merging multi-section evidence...";
    case "complete":
      return "Analysis complete";
    default:
      return "Processing...";
  }
}

interface UploadResult {
  document: any;
  isDuplicate: boolean;
}

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected control ID when opened from control detail page */
  controlId?: number;
  controlNumber?: string;
  /**
   * Callback to upload files and trigger AI analysis via SSE.
   * Provided by ControlDocumentsSection when uploading against a specific control.
   * When absent, files upload to the central repository only (no analysis).
   */
  onUploadAndAnalyse?: (
    files: File[],
    metadata: { evidenceType?: string; documentDate?: string; description?: string }
  ) => Promise<void>;
  /** Live analysis state — passed from the parent's useDocumentAnalysis hook */
  analysisProgress?: AnalysisProgress | null;
  analysisMatches?: AnalysisMatch[];
  analysisComplete?: AnalysisCompleteResult | null;
  analysisError?: string | null;
  isAnalysing?: boolean;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  controlId,
  controlNumber,
  onUploadAndAnalyse,
  analysisProgress,
  analysisMatches,
  analysisComplete,
  analysisError,
  isAnalysing,
}: DocumentUploadDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [evidenceType, setEvidenceType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  // Tracks whether we used the control-specific (SSE analysis) upload path
  const [usedControlUpload, setUsedControlUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ─── Repository-only upload (no analysis) ──────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      if (evidenceType) formData.append("evidenceType", evidenceType);
      if (description) formData.append("description", description);
      if (documentDate) formData.append("documentDate", documentDate);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setUploadResults(data.documents || []);
      setUploadProgress(100);
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/stats"] });

      const dupes = (data.documents || []).filter((d: UploadResult) => d.isDuplicate).length;
      const newDocs = (data.documents || []).length - dupes;

      toast({
        title: "Upload complete",
        description: `${newDocs} document${newDocs !== 1 ? "s" : ""} uploaded${dupes > 0 ? `, ${dupes} duplicate${dupes !== 1 ? "s" : ""} skipped` : ""}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const validateFiles = useCallback((files: File[]): File[] => {
    const valid: File[] = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `"${file.name}" is not a supported file type. Allowed: PDF, DOCX, XLSX, PNG, JPG.`,
          variant: "destructive",
        });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `"${file.name}" exceeds the 25 MB limit.`,
          variant: "destructive",
        });
        continue;
      }
      valid.push(file);
    }
    return valid;
  }, [toast]);

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const valid = validateFiles(Array.from(files));
      setSelectedFiles((prev) => [...prev, ...valid]);
    },
    [validateFiles]
  );

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  // ─── Upload handler — routes to the correct pipeline ───────────────────────
  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    // When a control is selected AND the analysis callback is available,
    // use the control-specific SSE endpoint that triggers AI analysis.
    if (controlId && onUploadAndAnalyse) {
      setUsedControlUpload(true);
      setUploadProgress(10);
      try {
        await onUploadAndAnalyse(selectedFiles, {
          evidenceType: evidenceType || undefined,
          documentDate: documentDate || undefined,
          description: description || undefined,
        });
        setUploadProgress(100);
        toast({
          title: "Upload & analysis complete",
          description: `Documents uploaded and analysed against control ${controlNumber}.`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        toast({
          title: "Upload failed",
          description: msg,
          variant: "destructive",
        });
        setUploadProgress(0);
      }
      return;
    }

    // Fallback: repository-only upload (no control linking or analysis)
    setUsedControlUpload(false);
    setUploadProgress(10);
    uploadMutation.mutate(selectedFiles);
  }, [selectedFiles, controlId, onUploadAndAnalyse, evidenceType, documentDate, description, controlNumber, uploadMutation, toast]);

  const resetForm = useCallback(() => {
    setSelectedFiles([]);
    setEvidenceType("");
    setDescription("");
    setDocumentDate("");
    setUploadProgress(0);
    setUploadResults([]);
    setUsedControlUpload(false);
  }, []);

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        resetForm();
      }
      onOpenChange(isOpen);
    },
    [onOpenChange, resetForm]
  );

  const isUploading = uploadMutation.isPending || (usedControlUpload && uploadProgress > 0 && uploadProgress < 100 && !analysisComplete && !analysisError);
  const isComplete = uploadProgress === 100 && (!usedControlUpload || !!analysisComplete || !!analysisError);
  const showAnalysisProgress = usedControlUpload && (isAnalysing || !!analysisProgress);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-[450px] sm:w-[540px] overflow-y-auto" data-testid="document-upload-dialog">
        <SheetHeader>
          <SheetTitle>Upload Documents</SheetTitle>
          <SheetDescription>
            {controlNumber
              ? `Upload evidence documents for control ${controlNumber}`
              : "Upload documents to the central repository"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Drag-and-drop zone */}
          {!isComplete && !showAnalysisProgress && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colours cursor-pointer ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-upload"
            >
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOCX, XLSX, PNG, JPG — max 25 MB per file
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
                data-testid="input-file-upload"
              />
            </div>
          )}

          {/* Selected files list */}
          {selectedFiles.length > 0 && !isComplete && !showAnalysisProgress && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Selected files ({selectedFiles.length})
              </Label>
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 rounded-md border px-3 py-2"
                >
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    disabled={isUploading}
                    data-testid={`button-remove-file-${index}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Metadata fields */}
          {selectedFiles.length > 0 && !isComplete && !showAnalysisProgress && (
            <>
              <div className="space-y-2">
                <Label htmlFor="evidenceType">Evidence Type</Label>
                <Select value={evidenceType} onValueChange={setEvidenceType}>
                  <SelectTrigger id="evidenceType" data-testid="select-evidence-type">
                    <SelectValue placeholder="Select type (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVIDENCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentDate">Document Date</Label>
                <Input
                  id="documentDate"
                  type="date"
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  data-testid="input-document-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional notes about these documents..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  data-testid="input-description"
                />
              </div>
            </>
          )}

          {/* Upload progress — repository-only flow */}
          {isUploading && !usedControlUpload && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uploading...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Analysis progress — control-specific flow with SSE streaming */}
          {showAnalysisProgress && !analysisComplete && !analysisError && (
            <div className="space-y-4 p-4 rounded-lg border bg-blue-50/50">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                {analysisProgress ? getPhaseLabel(analysisProgress.phase) : "Uploading documents..."}
              </div>
              {analysisProgress && analysisProgress.total > 0 && (
                <Progress
                  value={(analysisProgress.current / analysisProgress.total) * 100}
                  className="h-2"
                />
              )}
              {analysisProgress?.message && (
                <p className="text-xs text-blue-600">{analysisProgress.message}</p>
              )}
              {/* Show matches as they stream in */}
              {analysisMatches && analysisMatches.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-blue-200">
                  <p className="text-xs font-medium text-blue-700">
                    Matches found: {analysisMatches.length}
                  </p>
                  {analysisMatches.slice(-3).map((match, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-blue-600">
                      <Sparkles className="h-3 w-3 shrink-0" />
                      <span>Q{match.questionId}: {match.strengthLabel}</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {(match.compositeScore * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Analysis error */}
          {usedControlUpload && analysisError && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                <AlertCircle className="h-4 w-4" />
                Analysis failed
              </div>
              <p className="text-xs text-red-600">{analysisError}</p>
            </div>
          )}

          {/* Analysis complete — control-specific flow */}
          {usedControlUpload && analysisComplete && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Upload & analysis complete
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-md border bg-green-50">
                  <span className="font-medium text-green-700">{analysisComplete.strongMatches}</span>
                  <span className="text-green-600 ml-1">strong matches</span>
                </div>
                <div className="p-2 rounded-md border bg-amber-50">
                  <span className="font-medium text-amber-700">{analysisComplete.partialMatches}</span>
                  <span className="text-amber-600 ml-1">partial matches</span>
                </div>
                <div className="p-2 rounded-md border bg-orange-50">
                  <span className="font-medium text-orange-700">{analysisComplete.weakMatches}</span>
                  <span className="text-orange-600 ml-1">weak matches</span>
                </div>
                <div className="p-2 rounded-md border bg-red-50">
                  <span className="font-medium text-red-700">{analysisComplete.evidenceGaps}</span>
                  <span className="text-red-600 ml-1">evidence gaps</span>
                </div>
              </div>
              {analysisComplete.pendingSuggestions > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-md border bg-purple-50 text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  <span className="text-purple-700">
                    <strong>{analysisComplete.pendingSuggestions}</strong> AI suggestions ready for review in the questionnaire below
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Upload results — repository-only flow */}
          {!usedControlUpload && isComplete && uploadResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Upload complete
              </div>
              {uploadResults.map((result, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-md border px-3 py-2">
                  {result.isDuplicate ? (
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {result.document?.title || result.document?.originalFilename}
                    </p>
                    {result.isDuplicate && (
                      <p className="text-xs text-amber-600">Already exists in repository</p>
                    )}
                  </div>
                  {result.document?.evidenceType && (
                    <Badge variant="outline" className="text-xs">
                      {result.document.evidenceType}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            {isComplete ? (
              <Button
                onClick={() => handleClose(false)}
                className="flex-1"
                data-testid="button-done"
              >
                Done
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleClose(false)}
                  disabled={isUploading || isAnalysing}
                  className="flex-1"
                  data-testid="button-cancel-upload"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || isUploading || isAnalysing}
                  className="flex-1"
                  data-testid="button-upload-all"
                >
                  {isUploading || isAnalysing
                    ? "Processing..."
                    : controlId && onUploadAndAnalyse
                      ? `Upload & Analyse ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}`
                      : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}`}
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
