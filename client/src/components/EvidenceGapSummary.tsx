import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileCheck2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import type { DocumentQuestionMatch } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvidenceGapSummaryProps {
  totalQuestions: number;
  questionMatches: DocumentQuestionMatch[];
  /** Array of question IDs that have at least one accepted strong match */
  questionsWithEvidence: Set<number>;
  /** Number of pending suggestions awaiting review */
  pendingSuggestions: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EvidenceGapSummary({
  totalQuestions,
  questionMatches,
  questionsWithEvidence,
  pendingSuggestions,
}: EvidenceGapSummaryProps) {
  if (totalQuestions === 0) return null;

  const coveredCount = questionsWithEvidence.size;
  const coveragePercent = Math.round((coveredCount / totalQuestions) * 100);

  // Determine progress colour
  let progressColour = "bg-red-500";
  if (coveragePercent >= 80) progressColour = "bg-green-500";
  else if (coveragePercent >= 50) progressColour = "bg-amber-500";

  return (
    <Card className="border-muted">
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-4">
          {/* Coverage info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileCheck2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium">
                  Evidence coverage: {coveredCount} of {totalQuestions} questions
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({coveragePercent}%)
                </span>
              </div>
              <div className="relative h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progressColour}`}
                  style={{ width: `${coveragePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Pending suggestions badge */}
          {pendingSuggestions > 0 && (
            <Tooltip>
              <TooltipTrigger>
                <Badge className="gap-1 bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-100 shrink-0">
                  <Sparkles className="h-3 w-3" />
                  {pendingSuggestions} to review
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{pendingSuggestions} AI-suggested response{pendingSuggestions !== 1 ? "s" : ""} awaiting your review</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Gap indicator */}
          {coveredCount < totalQuestions && pendingSuggestions === 0 && (
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  {totalQuestions - coveredCount} gap{totalQuestions - coveredCount !== 1 ? "s" : ""}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{totalQuestions - coveredCount} question{totalQuestions - coveredCount !== 1 ? "s have" : " has"} no supporting document evidence</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
