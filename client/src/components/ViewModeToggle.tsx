import { Button } from "@/components/ui/button";

interface ViewModeToggleProps {
  viewMode: "persona" | "all";
  personaCount: number;
  totalCount: number;
  onChange: (mode: "persona" | "all") => void;
}

export function ViewModeToggle({ viewMode, personaCount, totalCount, onChange }: ViewModeToggleProps) {
  return (
    <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange("persona")}
        className={`
          px-3 py-1.5 text-sm rounded-md transition-colors
          ${viewMode === "persona"
            ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }
        `}
        data-testid="button-view-persona"
      >
        By Persona ({personaCount})
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange("all")}
        className={`
          px-3 py-1.5 text-sm rounded-md transition-colors
          ${viewMode === "all"
            ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }
        `}
        data-testid="button-view-all"
      >
        All Questions ({totalCount})
      </Button>
    </div>
  );
}
