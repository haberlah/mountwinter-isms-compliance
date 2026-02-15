import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { apiRequest } from "@/lib/queryClient";
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  Check,
  X,
  Pencil,
  FileText,
  ExternalLink,
  Loader2,
} from "lucide-react";
import type { DocumentQuestionMatch } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentQuestionMatchesProps {
  questionId: number;
  matches: DocumentQuestionMatch[];
  organisationControlId: number;
  onSuggestionAccepted?: (matchId: number, responseText: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStrengthBadge(compositeScore: number) {
  if (compositeScore >= 0.85) {
    return (
      <Badge variant="outline" className="text-[10px] h-4 px-1 text-green-700 border-green-200 bg-green-50">
        Strong
      </Badge>
    );
  }
  if (compositeScore >= 0.7) {
    return (
      <Badge variant="outline" className="text-[10px] h-4 px-1 text-amber-700 border-amber-200 bg-amber-50">
        Partial
      </Badge>
    );
  }
  if (compositeScore >= 0.5) {
    return (
      <Badge variant="outline" className="text-[10px] h-4 px-1 text-orange-700 border-orange-200 bg-orange-50">
        Weak
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground">
      Minimal
    </Badge>
  );
}

// ─── Single Match Card ────────────────────────────────────────────────────────

function MatchCard({
  match,
  organisationControlId,
  onAccepted,
}: {
  match: DocumentQuestionMatch;
  organisationControlId: number;
  onAccepted?: (matchId: number, responseText: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedResponse, setEditedResponse] = useState(match.suggestedResponse || "");
  const [showPassage, setShowPassage] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isPending = match.userAccepted === null;
  const isAccepted = match.userAccepted === true;
  const isDismissed = match.userAccepted === false;

  // Accept suggestion mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/question-matches/${match.id}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/organisation-controls", String(organisationControlId), "question-matches"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/controls"],
      });
      onAccepted?.(match.id, match.suggestedResponse || "");
      toast({ title: "Suggestion accepted", description: "Response has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to accept suggestion.", variant: "destructive" });
    },
  });

  // Accept with edits mutation
  const acceptEditedMutation = useMutation({
    mutationFn: async (editedText: string) => {
      return apiRequest("POST", `/api/question-matches/${match.id}/accept-edited`, {
        editedResponse: editedText,
      });
    },
    onSuccess: (_: unknown, editedText: string) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/organisation-controls", String(organisationControlId), "question-matches"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/controls"],
      });
      onAccepted?.(match.id, editedText);
      setIsEditing(false);
      toast({ title: "Edited suggestion accepted", description: "Your edited response has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to accept edited suggestion.", variant: "destructive" });
    },
  });

  // Dismiss suggestion mutation
  const dismissMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/question-matches/${match.id}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/organisation-controls", String(organisationControlId), "question-matches"],
      });
      toast({ title: "Suggestion dismissed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to dismiss suggestion.", variant: "destructive" });
    },
  });

  const isProcessing = acceptMutation.isPending || dismissMutation.isPending || acceptEditedMutation.isPending;

  // Dismissed matches shown minimally
  if (isDismissed) {
    return null;
  }

  // Accepted matches shown as reference
  if (isAccepted) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50/30 p-3 space-y-1">
        <div className="flex items-center gap-2">
          <Check className="h-3 w-3 text-green-600" />
          <span className="text-xs font-medium text-green-700">Accepted</span>
          {getStrengthBadge(match.compositeScore)}
          {match.isCrossControl && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 border-dashed">
              📎 Cross-control
            </Badge>
          )}
        </div>
        {match.aiSummary && (
          <p className="text-xs text-muted-foreground">{match.aiSummary}</p>
        )}
      </div>
    );
  }

  // Pending suggestion — full display
  return (
    <div
      className={`rounded-md border p-3 space-y-2 ${
        match.compositeScore >= 0.85
          ? "border-green-200 bg-green-50/50"
          : match.compositeScore >= 0.7
          ? "border-amber-200 bg-amber-50/50"
          : "border-zinc-200 bg-zinc-50/50"
      } ${match.isCrossControl ? "border-dashed" : ""}`}
      data-testid={`match-card-${match.id}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span className="text-xs font-medium text-amber-700">AI Suggested</span>
          {getStrengthBadge(match.compositeScore)}
          {match.isCrossControl && match.sourceControlId && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 border-dashed">
              📎 Cross-control
            </Badge>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {Math.round(match.compositeScore * 100)}%
        </span>
      </div>

      {/* AI Summary */}
      {match.aiSummary && (
        <p className="text-xs text-muted-foreground">{match.aiSummary}</p>
      )}

      {/* Suggested response */}
      {!isEditing && match.suggestedResponse && (
        <div className="rounded border bg-background p-2">
          <p className="text-xs leading-relaxed whitespace-pre-wrap">
            {match.suggestedResponse}
          </p>
        </div>
      )}

      {/* Editable response */}
      {isEditing && (
        <div className="space-y-2">
          <Textarea
            value={editedResponse}
            onChange={(e) => setEditedResponse(e.target.value)}
            rows={4}
            className="text-xs resize-none"
            data-testid={`textarea-edit-suggestion-${match.id}`}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs"
              onClick={() => acceptEditedMutation.mutate(editedResponse)}
              disabled={!editedResponse.trim() || isProcessing}
              data-testid={`button-save-edited-${match.id}`}
            >
              {acceptEditedMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => {
                setIsEditing(false);
                setEditedResponse(match.suggestedResponse || "");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Matched passage (collapsible) */}
      {match.matchedPassage && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1 text-[10px] text-muted-foreground gap-1"
            onClick={() => setShowPassage(!showPassage)}
          >
            {showPassage ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Source passage
          </Button>
          {showPassage && (
            <blockquote className="mt-1 pl-3 border-l-2 border-muted text-[11px] text-muted-foreground italic leading-relaxed">
              {match.matchedPassage}
            </blockquote>
          )}
        </div>
      )}

      {/* Action buttons */}
      {!isEditing && isPending && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs"
            onClick={() => acceptMutation.mutate()}
            disabled={isProcessing}
            data-testid={`button-accept-${match.id}`}
          >
            {acceptMutation.isPending ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Check className="h-3 w-3 mr-1" />
            )}
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => {
              setEditedResponse(match.suggestedResponse || "");
              setIsEditing(true);
            }}
            disabled={isProcessing}
            data-testid={`button-edit-${match.id}`}
          >
            <Pencil className="h-3 w-3 mr-1" />
            Edit & Accept
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => dismissMutation.mutate()}
            disabled={isProcessing}
            data-testid={`button-dismiss-${match.id}`}
          >
            {dismissMutation.isPending ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <X className="h-3 w-3 mr-1" />
            )}
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DocumentQuestionMatches({
  questionId,
  matches,
  organisationControlId,
  onSuggestionAccepted,
}: DocumentQuestionMatchesProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Filter matches for this question
  const questionMatches = matches.filter((m) => m.questionId === questionId && m.isActive);

  if (questionMatches.length === 0) return null;

  // Categorise matches
  const pendingMatches = questionMatches.filter(
    (m) => m.userAccepted === null && m.compositeScore >= 0.5
  );
  const acceptedMatches = questionMatches.filter((m) => m.userAccepted === true);
  const strongPending = pendingMatches.filter((m) => m.compositeScore >= 0.7);
  const weakPending = pendingMatches.filter((m) => m.compositeScore < 0.7);

  // Summary text for collapsed state
  const summaryParts: string[] = [];
  if (strongPending.length > 0) {
    summaryParts.push(`${strongPending.length} pending review`);
  }
  if (acceptedMatches.length > 0) {
    summaryParts.push(`${acceptedMatches.length} accepted`);
  }
  if (weakPending.length > 0) {
    summaryParts.push(`${weakPending.length} weak`);
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs font-medium text-muted-foreground h-7 px-2"
          data-testid={`button-toggle-matches-${questionId}`}
        >
          {isOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <FileText className="h-3 w-3" />
          Document Evidence
          <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1">
            {questionMatches.filter((m) => m.userAccepted !== false).length}
          </Badge>
          {strongPending.length > 0 && (
            <Badge className="text-[10px] h-4 px-1 ml-0.5 bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-100">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
              {strongPending.length} to review
            </Badge>
          )}
          {!isOpen && summaryParts.length > 0 && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              {summaryParts.join(" · ")}
            </span>
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-2 pl-2 pt-1 pb-1">
          {/* Strong pending suggestions first */}
          {strongPending.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              organisationControlId={organisationControlId}
              onAccepted={onSuggestionAccepted}
            />
          ))}

          {/* Accepted matches */}
          {acceptedMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              organisationControlId={organisationControlId}
            />
          ))}

          {/* Weaker matches (collapsed by default) */}
          {weakPending.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] text-muted-foreground h-5 px-1 gap-1"
                >
                  {weakPending.length} weaker match{weakPending.length !== 1 ? "es" : ""}
                  <ChevronDown className="h-2.5 w-2.5" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 pt-1">
                  {weakPending.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      organisationControlId={organisationControlId}
                      onAccepted={onSuggestionAccepted}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
