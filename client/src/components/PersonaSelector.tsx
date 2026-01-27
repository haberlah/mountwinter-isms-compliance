import { Shield, Lightbulb, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Persona } from "@shared/schema";

interface PersonaSelectorProps {
  selected: Persona;
  questionCounts: { Auditor: number; Advisor: number; Analyst: number };
  onChange: (persona: Persona) => void;
  disabled?: boolean;
}

const personaConfig: Record<Persona, { icon: typeof Shield; label: string }> = {
  Auditor: { icon: Shield, label: "Auditor" },
  Advisor: { icon: Lightbulb, label: "Advisor" },
  Analyst: { icon: BarChart3, label: "Analyst" },
};

export function PersonaSelector({
  selected,
  questionCounts,
  onChange,
  disabled = false,
}: PersonaSelectorProps) {
  const personas: Persona[] = ["Auditor", "Advisor", "Analyst"];

  return (
    <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
      {personas.map((persona) => {
        const config = personaConfig[persona];
        const Icon = config.icon;
        const isSelected = selected === persona;
        const count = questionCounts[persona];

        return (
          <Tooltip key={persona}>
            <TooltipTrigger asChild>
              <Button
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                onClick={() => onChange(persona)}
                disabled={disabled}
                data-testid={`button-persona-${persona.toLowerCase()}`}
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
