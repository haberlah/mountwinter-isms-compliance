import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, Plus, Check, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeverityBadge } from "./SeverityBadge";
import type { OntologyQuestion, Persona, QuestionResponse } from "@shared/schema";

interface QuestionCardProps {
  question: OntologyQuestion;
  questionNumber: number;
  response?: QuestionResponse;
  persona: Persona;
  onResponseChange: (questionId: number, responseText: string) => void;
  onEvidenceAdd: (questionId: number, filename: string) => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
}

interface CollapsibleSectionProps {
  title: string;
  content: string;
  defaultOpen?: boolean;
  highlighted?: boolean;
  icon?: "warning" | null;
}

function CollapsibleSection({ title, content, defaultOpen = false, highlighted = false, icon }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!content) return null;

  return (
    <div className={`rounded-md ${highlighted ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800" : ""}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left py-2 px-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
        data-testid={`button-toggle-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-zinc-400" />
        )}
        {icon === "warning" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
        {title}
      </button>
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
  onEvidenceAdd,
  saveStatus,
}: QuestionCardProps) {
  const [responseText, setResponseText] = useState(response?.response_text || "");
  const [evidenceInput, setEvidenceInput] = useState("");

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

  const handleAddEvidence = () => {
    if (evidenceInput.trim()) {
      onEvidenceAdd(question.question_id, evidenceInput.trim());
      setEvidenceInput("");
    }
  };

  return (
    <Card className="border-zinc-200 dark:border-zinc-700" data-testid={`card-question-${question.question_id}`}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
              Q{questionNumber}
            </span>
            <p className="font-medium text-sm pt-0.5">{question.question}</p>
          </div>
          <SeverityBadge severity={question.severity} />
        </div>

        <div className="space-y-1 ml-10">
          <CollapsibleSection
            title="Guidance"
            content={question.guidance}
            defaultOpen
          />

          {visibleFields.auditorFocus !== "hidden" && (
            <CollapsibleSection
              title="Auditor Focus"
              content={question.auditor_focus}
              defaultOpen={visibleFields.auditorFocus === "highlighted"}
              highlighted={visibleFields.auditorFocus === "highlighted"}
            />
          )}

          {visibleFields.whatGoodLooksLike !== "hidden" && (
            <CollapsibleSection
              title="What Good Looks Like"
              content={question.what_good_looks_like}
              defaultOpen={visibleFields.whatGoodLooksLike === "highlighted"}
              highlighted={visibleFields.whatGoodLooksLike === "highlighted"}
            />
          )}

          {visibleFields.redFlags === "visible" && question.red_flags && (
            <CollapsibleSection
              title="Red Flags"
              content={question.red_flags}
              icon="warning"
            />
          )}

          {visibleFields.ncPattern !== "hidden" && question.nc_pattern && (
            <CollapsibleSection
              title="NC Pattern"
              content={question.nc_pattern}
            />
          )}

          {visibleFields.relatedControls !== "hidden" && question.related_controls && (
            <CollapsibleSection
              title="Related Controls"
              content={question.related_controls}
              defaultOpen={visibleFields.relatedControls === "visible"}
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
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs text-muted-foreground">Evidence:</span>
              {response?.evidence_references && response.evidence_references.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {response.evidence_references.map((ref, i) => (
                    <span
                      key={i}
                      className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded"
                    >
                      {ref}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Input
                  value={evidenceInput}
                  onChange={(e) => setEvidenceInput(e.target.value)}
                  placeholder="filename.pdf"
                  className="h-7 text-xs w-32"
                  onKeyDown={(e) => e.key === "Enter" && handleAddEvidence()}
                  data-testid={`input-evidence-${question.question_id}`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={handleAddEvidence}
                  data-testid={`button-add-evidence-${question.question_id}`}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs">
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
              {saveStatus === "idle" && responseText && (
                <span className="text-amber-500">Unsaved</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
