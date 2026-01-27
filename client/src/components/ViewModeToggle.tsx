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
        variant={viewMode === "persona" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("persona")}
        data-testid="button-view-persona"
      >
        By Persona ({personaCount})
      </Button>
      <Button
        variant={viewMode === "all" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("all")}
        data-testid="button-view-all"
      >
        All Questions ({totalCount})
      </Button>
    </div>
  );
}
