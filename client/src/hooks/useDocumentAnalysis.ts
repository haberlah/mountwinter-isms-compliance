import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalysisProgress {
  phase: "extracting" | "chunking" | "analysing" | "fusion" | "complete";
  current: number;
  total: number;
  message: string;
}

export interface AnalysisMatch {
  questionId: number;
  compositeScore: number;
  matchedPassage: string;
  suggestedResponse: string;
  strengthLabel: string;
}

export interface AnalysisCompleteResult {
  totalMatches: number;
  strongMatches: number;
  partialMatches: number;
  weakMatches: number;
  evidenceGaps: number;
  pendingSuggestions: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook to manage SSE-streamed document upload + analysis for a control.
 * Follows the same streaming pattern as useAIAnalysis.ts.
 */
export function useDocumentAnalysis(controlId: number | undefined) {
  const queryClient = useQueryClient();

  const [isUploading, setIsUploading] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [matches, setMatches] = useState<AnalysisMatch[]>([]);
  const [completeResult, setCompleteResult] = useState<AnalysisCompleteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  /**
   * Upload files to a control and stream analysis progress via SSE.
   */
  const uploadAndAnalyse = useCallback(
    async (
      files: File[],
      metadata: {
        evidenceType?: string;
        documentDate?: string;
        description?: string;
      }
    ) => {
      if (!controlId || files.length === 0) return;

      // Reset state
      setIsUploading(true);
      setIsAnalysing(false);
      setProgress(null);
      setMatches([]);
      setCompleteResult(null);
      setError(null);

      abortRef.current = new AbortController();

      try {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));
        if (metadata.evidenceType) formData.append("evidenceType", metadata.evidenceType);
        if (metadata.documentDate) formData.append("documentDate", metadata.documentDate);
        if (metadata.description) formData.append("description", metadata.description);

        const response = await fetch(
          `/api/organisation-controls/${controlId}/documents/upload`,
          {
            method: "POST",
            body: formData,
            credentials: "include",
            signal: abortRef.current.signal,
          }
        );

        if (!response.ok) {
          let errorMsg = "Upload failed";
          try {
            const errData = await response.json();
            errorMsg = errData.error || errorMsg;
          } catch {
            // Response may not be JSON
          }
          throw new Error(errorMsg);
        }

        // Process SSE stream
        setIsUploading(false);
        setIsAnalysing(true);

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response stream available");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        const processLine = (line: string) => {
          if (!line.startsWith("data: ")) return;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.phase) {
              // Progress event
              setProgress({
                phase: data.phase,
                current: data.current ?? 0,
                total: data.total ?? 0,
                message: data.message || "",
              });
            }

            if (data.questionId !== undefined && data.compositeScore !== undefined) {
              // Match event
              setMatches((prev) => [
                ...prev,
                {
                  questionId: data.questionId,
                  compositeScore: data.compositeScore,
                  matchedPassage: data.matchedPassage || "",
                  suggestedResponse: data.suggestedResponse || "",
                  strengthLabel: data.strengthLabel || "",
                },
              ]);
            }

            if (data.totalMatches !== undefined) {
              // Complete event
              setCompleteResult({
                totalMatches: data.totalMatches,
                strongMatches: data.strongMatches ?? 0,
                partialMatches: data.partialMatches ?? 0,
                weakMatches: data.weakMatches ?? 0,
                evidenceGaps: data.evidenceGaps ?? 0,
                pendingSuggestions: data.pendingSuggestions ?? 0,
              });
            }

            if (data.error) {
              setError(data.error);
            }
          } catch {
            // Skip invalid JSON lines
          }
        };

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
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

        // Invalidate relevant caches on completion
        queryClient.invalidateQueries({
          queryKey: ["/api/organisation-controls", String(controlId), "documents"],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/organisation-controls", String(controlId), "question-matches"],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/organisation-controls", String(controlId), "evidence-gaps"],
        });
        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        queryClient.invalidateQueries({ queryKey: ["/api/documents/stats"] });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return; // User cancelled
        }
        const errorMessage = err instanceof Error ? err.message : "Analysis failed";
        setError(errorMessage);
      } finally {
        setIsUploading(false);
        setIsAnalysing(false);
        abortRef.current = null;
      }
    },
    [controlId, queryClient]
  );

  /**
   * Re-trigger analysis for an already-linked document.
   */
  const reanalyse = useCallback(
    async (documentId: number) => {
      if (!controlId) return;

      setIsAnalysing(true);
      setProgress(null);
      setMatches([]);
      setCompleteResult(null);
      setError(null);

      abortRef.current = new AbortController();

      try {
        const response = await fetch(
          `/api/organisation-controls/${controlId}/documents/${documentId}/analyse`,
          {
            method: "POST",
            credentials: "include",
            signal: abortRef.current.signal,
          }
        );

        if (!response.ok) {
          let errorMsg = "Re-analysis failed";
          try {
            const errData = await response.json();
            errorMsg = errData.error || errorMsg;
          } catch {
            // Response may not be JSON
          }
          throw new Error(errorMsg);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response stream available");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        const processLine = (line: string) => {
          if (!line.startsWith("data: ")) return;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.phase) {
              setProgress({
                phase: data.phase,
                current: data.current ?? 0,
                total: data.total ?? 0,
                message: data.message || "",
              });
            }

            if (data.questionId !== undefined && data.compositeScore !== undefined) {
              setMatches((prev) => [
                ...prev,
                {
                  questionId: data.questionId,
                  compositeScore: data.compositeScore,
                  matchedPassage: data.matchedPassage || "",
                  suggestedResponse: data.suggestedResponse || "",
                  strengthLabel: data.strengthLabel || "",
                },
              ]);
            }

            if (data.totalMatches !== undefined) {
              setCompleteResult({
                totalMatches: data.totalMatches,
                strongMatches: data.strongMatches ?? 0,
                partialMatches: data.partialMatches ?? 0,
                weakMatches: data.weakMatches ?? 0,
                evidenceGaps: data.evidenceGaps ?? 0,
                pendingSuggestions: data.pendingSuggestions ?? 0,
              });
            }

            if (data.error) {
              setError(data.error);
            }
          } catch {
            // Skip invalid JSON lines
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
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

        // Invalidate caches
        queryClient.invalidateQueries({
          queryKey: ["/api/organisation-controls", String(controlId), "documents"],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/organisation-controls", String(controlId), "question-matches"],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/organisation-controls", String(controlId), "evidence-gaps"],
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const errorMessage = err instanceof Error ? err.message : "Re-analysis failed";
        setError(errorMessage);
      } finally {
        setIsAnalysing(false);
        abortRef.current = null;
      }
    },
    [controlId, queryClient]
  );

  /**
   * Cancel any in-flight upload or analysis.
   */
  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  /**
   * Reset all state.
   */
  const reset = useCallback(() => {
    setIsUploading(false);
    setIsAnalysing(false);
    setProgress(null);
    setMatches([]);
    setCompleteResult(null);
    setError(null);
  }, []);

  return {
    uploadAndAnalyse,
    reanalyse,
    cancel,
    reset,
    isUploading,
    isAnalysing,
    progress,
    matches,
    completeResult,
    error,
  };
}
