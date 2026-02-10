import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, X, FileText, Link as LinkIcon, Shield, Table2, ClipboardList, File } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EvidenceLink } from "@shared/schema";

const EVIDENCE_TYPES = [
  { value: "REGISTER", label: "Register", icon: ClipboardList },
  { value: "RECORD", label: "Record", icon: FileText },
  { value: "POLICY", label: "Policy", icon: Shield },
  { value: "MATRIX", label: "Matrix", icon: Table2 },
  { value: "DOCUMENT", label: "Document", icon: File },
  { value: "OTHER", label: "Other", icon: FileText },
] as const;

function getTypeIcon(type: string | null) {
  const found = EVIDENCE_TYPES.find((t) => t.value === type);
  return found?.icon || FileText;
}

function getTypeLabel(type: string | null) {
  const found = EVIDENCE_TYPES.find((t) => t.value === type);
  return found?.label || type || "";
}

interface CollectedEvidence {
  title: string;
  url?: string;
  evidenceType?: string;
  description?: string;
}

interface ManageModeProps {
  mode: "manage";
  organisationControlId: number;
  questionId?: number;
  readOnly?: boolean;
}

interface CollectModeProps {
  mode: "collect";
  onCollectedChange: (evidence: CollectedEvidence[]) => void;
  suggestedTypes?: string[];
}

type EvidenceLinkManagerProps = ManageModeProps | CollectModeProps;

export function EvidenceLinkManager(props: EvidenceLinkManagerProps) {
  if (props.mode === "manage") {
    return <ManageMode {...props} />;
  }
  return <CollectMode {...props} />;
}

function ManageMode({ organisationControlId, questionId, readOnly }: ManageModeProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [evidenceType, setEvidenceType] = useState<string>("");
  const [description, setDescription] = useState("");

  const queryKeyBase = `/api/organisation-controls/${organisationControlId}/evidence-links`;
  const queryKey = questionId !== undefined
    ? [queryKeyBase, { questionId }]
    : [queryKeyBase];

  const { data: links = [] } = useQuery<EvidenceLink[]>({
    queryKey,
    queryFn: async () => {
      const urlParams = questionId !== undefined ? `?questionId=${questionId}` : "";
      const res = await fetch(`${queryKeyBase}${urlParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch evidence links");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; url?: string; evidenceType?: string; description?: string; questionId?: number }) => {
      const res = await apiRequest("POST", queryKeyBase, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyBase] });
      resetForm();
      setSheetOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/evidence-links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyBase] });
    },
  });

  const resetForm = () => {
    setTitle("");
    setUrl("");
    setEvidenceType("");
    setDescription("");
  };

  const handleAdd = () => {
    if (!title.trim()) return;
    createMutation.mutate({
      title: title.trim(),
      url: url.trim() || undefined,
      evidenceType: evidenceType || undefined,
      description: description.trim() || undefined,
      questionId,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Evidence:</span>
        {links.map((link) => (
          <EvidenceChip
            key={link.id}
            title={link.title}
            type={link.evidenceType}
            url={link.url}
            onDelete={readOnly ? undefined : () => deleteMutation.mutate(link.id)}
          />
        ))}
        {!readOnly && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Add Evidence</SheetTitle>
                <SheetDescription>
                  Link a document, policy, or other evidence
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="ev-title">Title *</Label>
                  <Input
                    id="ev-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Information Security Policy v2.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ev-url">URL</Label>
                  <Input
                    id="ev-url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ev-type">Evidence Type</Label>
                  <Select value={evidenceType} onValueChange={setEvidenceType}>
                    <SelectTrigger id="ev-type">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {EVIDENCE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ev-desc">Description</Label>
                  <Textarea
                    id="ev-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional notes about this evidence..."
                    rows={2}
                  />
                </div>
                <Button
                  onClick={handleAdd}
                  disabled={!title.trim() || createMutation.isPending}
                  className="w-full"
                >
                  {createMutation.isPending ? "Adding..." : "Add Evidence"}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  );
}

function CollectMode({ onCollectedChange }: CollectModeProps) {
  const [collected, setCollected] = useState<CollectedEvidence[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [evidenceType, setEvidenceType] = useState<string>("");
  const [description, setDescription] = useState("");

  const resetForm = () => {
    setTitle("");
    setUrl("");
    setEvidenceType("");
    setDescription("");
  };

  const handleAdd = useCallback(() => {
    if (!title.trim()) return;
    const newEvidence: CollectedEvidence = {
      title: title.trim(),
      url: url.trim() || undefined,
      evidenceType: evidenceType || undefined,
      description: description.trim() || undefined,
    };
    const next = [...collected, newEvidence];
    setCollected(next);
    onCollectedChange(next);
    resetForm();
    setSheetOpen(false);
  }, [title, url, evidenceType, description, collected, onCollectedChange]);

  const handleRemove = useCallback(
    (index: number) => {
      const next = collected.filter((_, i) => i !== index);
      setCollected(next);
      onCollectedChange(next);
    },
    [collected, onCollectedChange]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Evidence:</span>
        {collected.map((ev, i) => (
          <EvidenceChip
            key={i}
            title={ev.title}
            type={ev.evidenceType || null}
            url={ev.url || null}
            onDelete={() => handleRemove(i)}
          />
        ))}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Add Evidence</SheetTitle>
              <SheetDescription>
                Link a document, policy, or other evidence to this test run
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="ev-title-collect">Title *</Label>
                <Input
                  id="ev-title-collect"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Information Security Policy v2.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-url-collect">URL</Label>
                <Input
                  id="ev-url-collect"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-type-collect">Evidence Type</Label>
                <Select value={evidenceType} onValueChange={setEvidenceType}>
                  <SelectTrigger id="ev-type-collect">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EVIDENCE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-desc-collect">Description</Label>
                <Textarea
                  id="ev-desc-collect"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional notes about this evidence..."
                  rows={2}
                />
              </div>
              <Button
                onClick={handleAdd}
                disabled={!title.trim()}
                className="w-full"
              >
                Add Evidence
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function EvidenceChip({
  title,
  type,
  url,
  onDelete,
}: {
  title: string;
  type: string | null;
  url?: string | null;
  onDelete?: () => void;
}) {
  const TypeIcon = getTypeIcon(type);
  const typeLabel = getTypeLabel(type);

  const chip = (
    <span className="inline-flex items-center gap-1 text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded group">
      <TypeIcon className="h-3 w-3 text-muted-foreground shrink-0" />
      {typeLabel && <span className="text-muted-foreground">{typeLabel}:</span>}
      <span className="truncate max-w-[150px]">{title}</span>
      {url && <LinkIcon className="h-2.5 w-2.5 text-muted-foreground shrink-0" />}
      {onDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove evidence?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove "{title}" from this control. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </span>
  );

  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="no-underline">
        {chip}
      </a>
    );
  }

  return chip;
}
