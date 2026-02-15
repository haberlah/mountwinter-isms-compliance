import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useDocumentAnalysis } from "@/hooks/useDocumentAnalysis";
import { DocumentUploadDialog } from "@/components/DocumentUploadDialog";
import { apiRequest } from "@/lib/queryClient";
import {
  ChevronDown,
  ChevronRight,
  Upload,
  Link as LinkIcon,
  FileText,
  FileSpreadsheet,
  Image,
  CheckCircle2,
  Loader2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Unlink,
  FolderOpen,
} from "lucide-react";
import type { Document, DocumentControlLink } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ControlDocument {
  document: Document;
  link: DocumentControlLink;
}

interface ControlDocumentsSectionProps {
  organisationControlId: number | undefined;
  controlNumber: string;
  controlId: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: string | Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isStale(documentDate: string | Date | null): boolean {
  if (!documentDate) return false;
  return Date.now() - new Date(documentDate).getTime() > 365 * 24 * 60 * 60 * 1000;
}

function getFileIcon(mimeType: string) {
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  if (mimeType?.includes("word")) return <FileText className="h-4 w-4 text-blue-500" />;
  if (mimeType?.includes("spreadsheet")) return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
  if (mimeType?.startsWith("image/")) return <Image className="h-4 w-4 text-purple-500" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

function getAnalysisStatusBadge(status: string | null) {
  switch (status) {
    case "analysed":
      return (
        <Tooltip>
          <TooltipTrigger>
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          </TooltipTrigger>
          <TooltipContent>Analysis complete</TooltipContent>
        </Tooltip>
      );
    case "analysing":
    case "extracting":
      return (
        <Tooltip>
          <TooltipTrigger>
            <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
          </TooltipTrigger>
          <TooltipContent>Processing...</TooltipContent>
        </Tooltip>
      );
    case "error":
      return (
        <Tooltip>
          <TooltipTrigger>
            <XCircle className="h-3.5 w-3.5 text-red-500" />
          </TooltipTrigger>
          <TooltipContent>Analysis failed</TooltipContent>
        </Tooltip>
      );
    case "pending":
    default:
      return (
        <Tooltip>
          <TooltipTrigger>
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>Pending analysis</TooltipContent>
        </Tooltip>
      );
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ControlDocumentsSection({
  organisationControlId,
  controlNumber,
  controlId,
}: ControlDocumentsSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    uploadAndAnalyse,
    isAnalysing,
    progress,
    matches,
    completeResult,
    error: analysisError,
  } = useDocumentAnalysis(organisationControlId);

  // Fetch documents linked to this control
  const { data: controlDocuments, isLoading } = useQuery<ControlDocument[]>({
    queryKey: ["/api/organisation-controls", String(organisationControlId), "documents"],
    enabled: !!organisationControlId,
  });

  // Unlink document mutation
  const unlinkMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return apiRequest(
        "DELETE",
        `/api/organisation-controls/${organisationControlId}/documents/${documentId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/organisation-controls", String(organisationControlId), "documents"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/organisation-controls", String(organisationControlId), "question-matches"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/organisation-controls", String(organisationControlId), "evidence-gaps"],
      });
      toast({ title: "Document unlinked", description: "Document has been removed from this control." });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unlink document.",
        variant: "destructive",
      });
    },
  });

  const documents = controlDocuments || [];
  const documentCount = documents.length;

  // Separate own documents from cross-control references
  const ownDocuments = documents.filter((d) => !d.link.analysisStatus || d.link.analysisStatus !== undefined);
  // For now, cross-control documents would be surfaced through question matches (Phase 7)

  return (
    <>
      <Card>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">Evidence Documents</CardTitle>
                  {documentCount > 0 && (
                    <Badge variant="secondary" className="text-xs h-5 px-1.5">
                      {documentCount}
                    </Badge>
                  )}
                </div>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 px-4 pb-4 space-y-3">
              {/* Analysis progress indicator */}
              {isAnalysing && progress && (
                <div className="space-y-1.5 p-3 rounded-md border bg-blue-50/50">
                  <div className="flex items-center gap-2 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                    <span className="text-blue-700 font-medium">{progress.message}</span>
                  </div>
                  {progress.total > 0 && (
                    <Progress
                      value={(progress.current / progress.total) * 100}
                      className="h-1.5"
                    />
                  )}
                </div>
              )}

              {/* Analysis error */}
              {analysisError && (
                <div className="flex items-center gap-2 text-xs p-2 rounded-md border border-red-200 bg-red-50">
                  <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <span className="text-red-700">{analysisError}</span>
                </div>
              )}

              {/* Document list */}
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading documents...
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-4">
                  <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    No documents linked to this control
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {documents.map(({ document: doc, link }) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm group"
                      data-testid={`control-document-${doc.id}`}
                    >
                      {getFileIcon(doc.mimeType)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{formatFileSize(doc.fileSize)}</span>
                          {doc.documentDate && (
                            <>
                              <span>·</span>
                              <span>{formatDate(doc.documentDate)}</span>
                              {isStale(doc.documentDate) && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Document is over 12 months old — may need updating
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {getAnalysisStatusBadge(link.analysisStatus)}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => window.open(`/api/documents/${doc.id}/download`, "_blank")}
                              data-testid={`button-download-doc-${doc.id}`}
                            >
                              <FileText className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              onClick={() => unlinkMutation.mutate(doc.id)}
                              disabled={unlinkMutation.isPending}
                              data-testid={`button-unlink-doc-${doc.id}`}
                            >
                              <Unlink className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Unlink from control</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs h-8"
                  onClick={() => setUploadOpen(true)}
                  data-testid="button-upload-control-docs"
                >
                  <Upload className="h-3 w-3 mr-1.5" />
                  Upload
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Upload dialog — pre-selected with this control */}
      <DocumentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        controlId={organisationControlId}
        controlNumber={controlNumber}
        onUploadAndAnalyse={uploadAndAnalyse}
        analysisProgress={progress}
        analysisMatches={matches}
        analysisComplete={completeResult}
        analysisError={analysisError}
        isAnalysing={isAnalysing}
      />
    </>
  );
}
