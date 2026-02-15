import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Upload,
  Search,
  FileText,
  FileSpreadsheet,
  Image,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  FolderOpen,
} from "lucide-react";
import { DocumentUploadDialog } from "@/components/DocumentUploadDialog";
import type { Document } from "@shared/schema";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function getStatusBadge(status: string | null) {
  switch (status) {
    case "extracted":
    case "analysed":
      return (
        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {status === "analysed" ? "Analysed" : "Ready"}
        </Badge>
      );
    case "extracting":
    case "analysing":
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      );
    case "error":
      return (
        <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
          <XCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
  }
}

function getEvidenceTypeBadge(type: string | null) {
  if (!type) return null;
  const colours: Record<string, string> = {
    POLICY: "bg-blue-50 text-blue-700 border-blue-200",
    REGISTER: "bg-purple-50 text-purple-700 border-purple-200",
    RECORD: "bg-green-50 text-green-700 border-green-200",
    MATRIX: "bg-amber-50 text-amber-700 border-amber-200",
    DOCUMENT: "bg-gray-50 text-gray-700 border-gray-200",
    OTHER: "bg-gray-50 text-gray-600 border-gray-200",
  };
  return (
    <Badge variant="outline" className={colours[type] || ""}>
      {type.charAt(0) + type.slice(1).toLowerCase()}
    </Badge>
  );
}

// ─── Evidence type options for filter ─────────────────────────────────────

const EVIDENCE_TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "POLICY", label: "Policy" },
  { value: "REGISTER", label: "Register" },
  { value: "RECORD", label: "Record" },
  { value: "MATRIX", label: "Matrix" },
  { value: "DOCUMENT", label: "Document" },
  { value: "OTHER", label: "Other" },
];

// ─── Types ────────────────────────────────────────────────────────────────

interface DocumentsResponse {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface DocumentStats {
  totalDocuments: number;
  totalFileSize: number;
  controlsWithEvidence: number;
  pendingSuggestions: number;
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────

function DocumentsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 max-w-sm" />
        <Skeleton className="h-10 w-40" />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 border-b last:border-0">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function Documents() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (typeFilter !== "all") queryParams.set("type", typeFilter);
  queryParams.set("page", String(page));
  queryParams.set("limit", "25");

  const { data, isLoading, error } = useQuery<DocumentsResponse>({
    queryKey: ["/api/documents", `?${queryParams.toString()}`],
  });

  const { data: stats } = useQuery<DocumentStats>({
    queryKey: ["/api/documents/stats"],
  });

  if (isLoading) return <DocumentsSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <XCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold">Failed to load documents</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {error instanceof Error ? error.message : "An unexpected error occurred"}
        </p>
      </div>
    );
  }

  const documents = data?.documents || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-6" data-testid="page-documents">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-documents-title">
            Document Repository
          </h2>
          <p className="text-muted-foreground">
            {stats
              ? `${stats.totalDocuments} document${stats.totalDocuments !== 1 ? "s" : ""} · ${formatFileSize(stats.totalFileSize)} total`
              : "Manage your evidence documents"}
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)} data-testid="button-upload-documents">
          <Upload className="h-4 w-4 mr-2" />
          Upload Documents
        </Button>
      </div>

      {/* Stats cards (compact) */}
      {stats && stats.totalDocuments > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              <p className="text-xs text-muted-foreground">Total documents</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-2xl font-bold">{stats.controlsWithEvidence}</div>
              <p className="text-xs text-muted-foreground">Controls with evidence</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-2xl font-bold">{stats.pendingSuggestions}</div>
              <p className="text-xs text-muted-foreground">Pending suggestions</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters row */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
            data-testid="input-search-documents"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(val) => {
            setTypeFilter(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]" data-testid="select-type-filter">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            {EVIDENCE_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Documents table */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No documents found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {search || typeFilter !== "all"
                ? "Try adjusting your search or filter criteria."
                : "Upload your first document to get started."}
            </p>
            {!search && typeFilter === "all" && (
              <Button onClick={() => setUploadOpen(true)} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Documents
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[80px] text-right">Size</TableHead>
                  <TableHead className="w-[120px]">Upload Date</TableHead>
                  <TableHead className="w-[120px]">Document Date</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                    <TableCell>{getFileIcon(doc.mimeType)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{doc.title}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {doc.originalFilename}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getEvidenceTypeBadge(doc.evidenceType)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatFileSize(doc.fileSize)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(doc.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(doc.documentDate)}
                        </span>
                        {isStale(doc.documentDate) && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Document is over 12 months old — may need updating</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.extractionStatus)}</TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(`/api/documents/${doc.id}/download`, "_blank")}
                            data-testid={`button-download-${doc.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Download</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({data?.total} documents)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              data-testid="button-prev-page"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              data-testid="button-next-page"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Upload dialog */}
      <DocumentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />
    </div>
  );
}
