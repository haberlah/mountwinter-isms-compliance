import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, Check, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SeverityBadge } from "./SeverityBadge";
import { EvidenceLinkManager } from "./EvidenceLinkManager";
import { DocumentQuestionMatches } from "./DocumentQuestionMatches";
import type { OntologyQuestion, Persona, QuestionResponse, DocumentQuestionMatch } from "@shared/schema";

interface QuestionCardProps {
  question: OntologyQuestion;
  questionNumber: number;
  response?: QuestionResponse;
  persona: Persona;
  onResponseChange: (questionId: number, responseText: string) => void;
  organisationControlId?: number;
  saveStatus: "idle" | "saving" | "saved" | "error";
  /** AI-generated document matches for this question */
  questionMatches?: DocumentQuestionMatch[];
  /** Evidence status: none, partial, or full — computed from matches */
  evidenceStatus?: "none" | "partial" | "full";
  /** Number of pending AI suggestions for this question */
  pendingSuggestions?: number;
}

interface CollapsibleSectionProps {
  title: string;
  content: string;
  defaultOpen?: boolean;
  highlighted?: boolean;
  icon?: "warning" | null;
  testId?: string;
}

function CollapsibleSection({ title, content, defaultOpen = false, highlighted = false, icon, testId }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!content) return null;

  return (
    <div className={`rounded-md ${highlighted ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800" : ""}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-start gap-2 font-medium text-zinc-700 dark:text-zinc-300"
        data-testid={testId}
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-zinc-400" />
        )}
        {icon === "warning" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
        {title}
      </Button>
      {isOpen && (
        <div className="px-3 pb-3 text-sm text-muted-foreground">
          {content}
        </div>
      )}
    </div>
  );
}

function getVisibleFields(persona: Persona): {
  auditorFocus: "highlighted" | "collapsed" | "hidden";
  whatGoodLooksLike: "highlighted" | "collapsed" | "hidden";
  redFlags: "visible" | "hidden";
  ncPattern: "collapsed" | "hidden";
  relatedControls: "collapsed" | "visible" | "hidden";
} {
  switch (persona) {
    case "Auditor":
      return {
        auditorFocus: "highlighted",
        whatGoodLooksLike: "collapsed",
        redFlags: "visible",
        ncPattern: "collapsed",
        relatedControls: "collapsed",
      };
    case "Advisor":
      return {
        auditorFocus: "collapsed",
        whatGoodLooksLike: "highlighted",
        redFlags: "hidden",
        ncPattern: "hidden",
        relatedControls: "visible",
      };
    case "Analyst":
      return {
        auditorFocus: "hidden",
        whatGoodLooksLike: "collapsed",
        redFlags: "hidden",
        ncPattern: "hidden",
        relatedControls: "collapsed",
      };
  }
}

export function QuestionCard({
  question,
  questionNumber,
  response,
  persona,
  onResponseChange,
  organisationControlId,
  saveStatus,
  questionMatches,
  evidenceStatus,
  pendingSuggestions,
}: QuestionCardProps) {
  const [responseText, setResponseText] = useState(response?.response_text || "");

  const visibleFields = getVisibleFields(persona);

  useEffect(() => {
    setResponseText(response?.response_text || "");
  }, [response?.response_text]);

  const handleResponseChange = useCallback(
    (value: string) => {
      setResponseText(value);
      onResponseChange(question.question_id, value);
    },
    [question.question_id, onResponseChange]
  );

  // Handle accepted suggestion — update local response text
  const handleSuggestionAccepted = useCallback(
    (matchId: number, responseText: string) => {
      setResponseText(responseText);
      onResponseChange(question.question_id, responseText);
    },
    [question.question_id, onResponseChange]
  );

  // Evidence status indicator
  const evidenceDot = evidenceStatus === "full" ? (
    <Tooltip>
      <TooltipTrigger>
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" data-testid={`evidence-dot-${question.question_id}`} />
      </TooltipTrigger>
      <TooltipContent>
        <p>Strong document evidence available</p>
      </TooltipContent>
    </Tooltip>
  ) : evidenceStatus === "partial" ? (
    <Tooltip>
      <TooltipTrigger>
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" data-testid={`evidence-dot-${question.question_id}`} />
      </TooltipTrigger>
      <TooltipContent>
        <p>Partial document evidence — review suggestions or upload additional documents</p>
      </TooltipContent>
    </Tooltip>
  ) : evidenceStatus === "none" ? (
    <Tooltip>
      <TooltipTrigger>
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400 shrink-0" data-testid={`evidence-dot-${question.question_id}`} />
      </TooltipTrigger>
      <TooltipContent>
        <p>No supporting documentation found. Expected: {question.evidence_type}</p>
      </TooltipContent>
    </Tooltip>
  ) : null;

  return (
    <Card className="border-zinc-200 dark:border-zinc-700" data-testid={`card-question-${question.question_id}`}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                Q{questionNumber}
              </span>
              {evidenceDot}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm pt-0.5">{question.question}</p>
              {(pendingSuggestions ?? 0) > 0 && (
                <Badge className="mt-1 text-[10px] h-4 px-1.5 bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-100">
                  {pendingSuggestions} suggestion{pendingSuggestions !== 1 ? "s" : ""} to review
                </Badge>
              )}
            </div>
          </div>
          <SeverityBadge severity={question.severity} />
        </div>

        <div className="space-y-1 ml-10">
          <CollapsibleSection
            title="Guidance"
            content={question.guidance}
            defaultOpen
            testId={`button-toggle-guidance-${question.question_id}`}
          />

          {visibleFields.auditorFocus !== "hidden" && (
            <CollapsibleSection
              title="Auditor Focus"
              content={question.auditor_focus}
              defaultOpen={visibleFields.auditorFocus === "highlighted"}
              highlighted={visibleFields.auditorFocus === "highlighted"}
              testId={`button-toggle-auditor-focus-${question.question_id}`}
            />
          )}

          {visibleFields.whatGoodLooksLike !== "hidden" && (
            <CollapsibleSection
              title="What Good Looks Like"
              content={question.what_good_looks_like}
              defaultOpen={visibleFields.whatGoodLooksLike === "highlighted"}
              highlighted={visibleFields.whatGoodLooksLike === "highlighted"}
              testId={`button-toggle-what-good-looks-like-${question.question_id}`}
            />
          )}

          {visibleFields.redFlags === "visible" && question.red_flags && (
            <CollapsibleSection
              title="Red Flags"
              content={question.red_flags}
              icon="warning"
              testId={`button-toggle-red-flags-${question.question_id}`}
            />
          )}

          {visibleFields.ncPattern !== "hidden" && question.nc_pattern && (
            <CollapsibleSection
              title="NC Pattern"
              content={question.nc_pattern}
              testId={`button-toggle-nc-pattern-${question.question_id}`}
            />
          )}

          {visibleFields.relatedControls !== "hidden" && question.related_controls && (
            <CollapsibleSection
              title="Related Controls"
              content={question.related_controls}
              defaultOpen={visibleFields.relatedControls === "visible"}
              testId={`button-toggle-related-controls-${question.question_id}`}
            />
          )}

          <div className="flex gap-4 text-xs text-muted-foreground pt-2">
            <span>
              <span className="font-medium">Expected:</span> {question.evidence_type}
            </span>
            <span>
              <span className="font-medium">Format:</span> {question.answer_type}
            </span>
          </div>
        </div>

        <div className="ml-10 space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-700">
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Response:</label>
            <Textarea
              value={responseText}
              onChange={(e) => handleResponseChange(e.target.value)}
              placeholder="Enter your response..."
              rows={3}
              className="resize-none"
              data-testid={`textarea-response-${question.question_id}`}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              {organisationControlId ? (
                <EvidenceLinkManager
                  mode="manage"
                  organisationControlId={organisationControlId}
                  questionId={question.question_id}
                />
              ) : (
                <span className="text-xs text-muted-foreground">Evidence: save control first</span>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs shrink-0 ml-2" data-testid={`status-save-${question.question_id}`}>
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Saving...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <Check className="h-3 w-3 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">Saved</span>
                </>
              )}
              {saveStatus === "error" && (
                <span className="text-destructive">Error saving</span>
              )}
              {saveStatus === "idle" && null}
            </div>
          </div>

          {/* Document evidence matches */}
          {organisationControlId && questionMatches && questionMatches.length > 0 && (
            <DocumentQuestionMatches
              questionId={question.question_id}
              matches={questionMatches}
              organisationControlId={organisationControlId}
              onSuggestionAccepted={handleSuggestionAccepted}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
