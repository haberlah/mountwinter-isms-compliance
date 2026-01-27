import { useState, useCallback } from "react";
import type { Persona } from "@shared/schema";

export interface AnalysisResult {
  assessment: string;
  suggested_status: "Pass" | "Fail" | "ContinualImprovement" | "NotAttempted";
  confidence: number;
  observations: string[];
  recommendations: string[];
  persona_specific: {
    // Auditor fields
    red_flags_triggered?: string[];
    nc_risk_areas?: string[];
    evidence_gaps?: string[];
    audit_opinion?: string;
    // Advisor fields
    improvement_opportunities?: string[];
    maturity_assessment?: string;
    related_controls_to_review?: string[];
    quick_wins?: string[];
    // Analyst fields
    compliance_score?: number;
    criteria_met?: number;
    criteria_total?: number;
    gap_analysis?: Array<{ criterion: string; status: string; weight: string }>;
    suggested_kpis?: string[];
  };
}

export function useAIAnalysis(controlNumber: string) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(
    async (persona: Persona, comments: string) => {
      setIsAnalyzing(true);
      setStreamedText("");
      setResult(null);
      setError(null);

      try {
        const response = await fetch(`/api/controls/${controlNumber}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ persona, include_history: true, comments }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Analysis failed");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response stream available");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let parsedResult: AnalysisResult | null = null;

        const parseAnalysisData = (data: Record<string, unknown>): AnalysisResult => ({
          assessment: (data.assessment as string) || "",
          suggested_status: ((data.suggested_status || data.suggestedStatus) as AnalysisResult["suggested_status"]) || "NotAttempted",
          confidence: (data.confidence as number) || 0.5,
          observations: (data.observations as string[]) || [],
          recommendations: (data.recommendations as string[]) || [],
          persona_specific: ((data.persona_specific || data.personaSpecific) as AnalysisResult["persona_specific"]) || {},
        });

        const processLine = (line: string) => {
          if (!line.startsWith("data: ")) return;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              setStreamedText((prev) => prev + data.text);
            } else if (data.error) {
              throw new Error(data.error);
            } else if ('suggested_status' in data || 'suggestedStatus' in data || 'assessment' in data || 'confidence' in data) {
              // This is a complete analysis result (check for key presence, not value truthiness)
              parsedResult = parseAnalysisData(data);
              setResult(parsedResult);
            }
          } catch (e) {
            // Skip invalid JSON or re-throw data errors
            if (e instanceof Error && e.message !== 'Unexpected token') {
              setError(e.message);
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Process remaining buffer when stream ends
            if (buffer.trim()) {
              buffer.split("\n").forEach(processLine);
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          lines.forEach(processLine);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Analysis failed";
        setError(errorMessage);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [controlNumber]
  );

  const reset = useCallback(() => {
    setStreamedText("");
    setResult(null);
    setError(null);
  }, []);

  return { analyze, isAnalyzing, streamedText, result, error, reset };
}
