import { Progress } from "@/components/ui/progress";
import type { Persona } from "@shared/schema";

interface ProgressSectionProps {
  total: number;
  answered: number;
  byPersona: Record<Persona, { total: number; answered: number }>;
}

export function ProgressSection({ total, answered, byPersona }: ProgressSectionProps) {
  const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Questionnaire Progress</span>
        <span className="text-sm text-muted-foreground">{percentage}%</span>
      </div>
      
      <Progress value={percentage} className="h-2" data-testid="progress-questionnaire" />
      
      <p className="text-sm text-muted-foreground">
        {answered} of {total} questions answered
      </p>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span data-testid="progress-auditor">
          Auditor: {byPersona.Auditor.answered}/{byPersona.Auditor.total}
        </span>
        <span data-testid="progress-advisor">
          Advisor: {byPersona.Advisor.answered}/{byPersona.Advisor.total}
        </span>
        <span data-testid="progress-analyst">
          Analyst: {byPersona.Analyst.answered}/{byPersona.Analyst.total}
        </span>
      </div>
    </div>
  );
}
