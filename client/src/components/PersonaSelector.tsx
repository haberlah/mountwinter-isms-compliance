import { Shield, Lightbulb, BarChart3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Persona } from "@shared/schema";

type PersonaOrAll = Persona | "All";

interface PersonaSelectorProps {
  selected: PersonaOrAll;
  questionCounts: { Auditor: number; Advisor: number; Analyst: number; All: number };
  onChange: (persona: PersonaOrAll) => void;
  disabled?: boolean;
}

const personaConfig: Record<PersonaOrAll, { icon: typeof Shield; label: string }> = {
  Auditor: { icon: Shield, label: "Auditor" },
  Advisor: { icon: Lightbulb, label: "Advisor" },
  Analyst: { icon: BarChart3, label: "Analyst" },
  All: { icon: List, label: "All" },
};

export function PersonaSelector({
  selected,
  questionCounts,
  onChange,
  disabled = false,
}: PersonaSelectorProps) {
  const options: PersonaOrAll[] = ["Auditor", "Advisor", "Analyst", "All"];

  return (
    <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex-wrap">
      {options.map((option) => {
        const config = personaConfig[option];
        const Icon = config.icon;
        const isSelected = selected === option;
        const count = questionCounts[option];

        return (
          <Tooltip key={option}>
            <TooltipTrigger asChild>
              <Button
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                onClick={() => onChange(option)}
                disabled={disabled}
                data-testid={`button-persona-${option.toLowerCase()}`}
              >
                <Icon className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline mr-1">{config.label}</span>
                <span className={`
                  text-xs font-medium px-1.5 py-0.5 rounded
                  ${isSelected 
                    ? "bg-primary-foreground/20 text-primary-foreground" 
                    : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                  }
                `}>
                  {count}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="sm:hidden">
              <p>{config.label} ({count} questions)</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export type { PersonaOrAll };
