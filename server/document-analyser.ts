import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_MODEL } from "./ai";
import { sanitiseTextForAI } from "./document-processor";
import type { OntologyQuestion } from "@shared/schema";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentChunkInput {
  chunkIndex: number;
  content: string;
  sectionHeading: string | null;
  chunkId?: number;
}

export interface DocumentMatchResult {
  questionId: number;
  contentRelevance: number;
  evidenceTypeMatch: boolean;
  specificity: number;
  compositeScore: number;
  matchedPassage: string;
  aiSummary: string;
  suggestedResponse: string;
  confidenceNotes: string;
  chunkIndex: number;
  chunkId?: number;
}

export interface AnalysisProgress {
  phase: "extracting" | "chunking" | "analysing" | "fusion" | "complete";
  current: number;
  total: number;
  message: string;
}

export interface AnalysisCompleteResult {
  totalMatches: number;
  strongMatches: number;
  partialMatches: number;
  weakMatches: number;
  evidenceGaps: number;
  pendingSuggestions: number;
}

// ─── Composite Score ──────────────────────────────────────────────────────────

function calculateCompositeScore(
  contentRelevance: number,
  evidenceTypeMatch: boolean,
  specificity: number
): number {
  return (
    0.5 * contentRelevance +
    0.2 * (evidenceTypeMatch ? 1.0 : 0.3) +
    0.3 * specificity
  );
}

function getStrengthLabel(compositeScore: number): string {
  if (compositeScore >= 0.85) return "strong";
  if (compositeScore >= 0.7) return "partial";
  if (compositeScore >= 0.5) return "weak";
  return "minimal";
}

// ─── Prompt Construction ──────────────────────────────────────────────────────

function buildChunkAnalysisPrompt(
  documentTitle: string,
  evidenceType: string | null,
  chunkContent: string,
  questions: OntologyQuestion[],
  organisationContext: string
): { system: string; user: string } {
  const system = `You are an ISO 27001:2022 compliance document analyst. Examine this document
section and determine which assessment questions it provides evidence for.

For each relevant question:
1. Extract the specific passage that addresses it (quote directly from the document)
2. Score content relevance 0.0–1.0 (how directly the passage answers the question)
3. Score specificity 0.0–1.0 (how specific vs generic the evidence is)
4. Check if the evidence type matches expectations
5. Write a DRAFT response that cites the document — clearly marked as a suggestion
6. Note any gaps, concerns, or missing elements

IMPORTANT: Your suggested responses are DRAFTS for human review. They will be
presented to the user for acceptance, editing, or dismissal. Be thorough but
clearly flag any uncertainty.

${organisationContext ? `Organisation context: ${organisationContext}` : ""}`;

  const questionsSection = questions
    .map(
      (q) =>
        `Q${q.question_id}: ${q.question}\n  Expected evidence: ${q.evidence_type}\n  What good looks like: ${q.what_good_looks_like}\n  Red flags: ${q.red_flags}`
    )
    .join("\n\n");

  const user = `## Document: ${documentTitle} (${evidenceType || "Untyped"})
## Content:
${chunkContent}

## Questions:
${questionsSection}

Return a JSON array of matches (only questions with content_relevance >= 0.3).
If no questions are relevant, return an empty array [].

Each match object:
{
  "question_id": number,
  "content_relevance": 0.0-1.0,
  "specificity": 0.0-1.0,
  "evidence_type_match": boolean,
  "matched_passage": "exact quote from document",
  "summary": "how this addresses the question",
  "suggested_response": "draft answer citing the document",
  "confidence_notes": "any caveats or uncertainties"
}

Return ONLY the JSON array, no markdown code fences or extra text.`;

  return { system, user };
}

function buildFusionPrompt(
  documentTitle: string,
  questionText: string,
  passages: string[],
  summaries: string[]
): { system: string; user: string } {
  const system = `You are an ISO 27001:2022 compliance analyst performing a fusion re-scoring.
Multiple sections of a single document address the same question. Combine the evidence
and provide a single unified assessment.`;

  const user = `## Document: ${documentTitle}
## Question: ${questionText}

## Passages from different sections:
${passages.map((p, i) => `### Section ${i + 1}:\n${p}`).join("\n\n")}

## Previous summaries:
${summaries.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Provide a unified assessment as JSON:
{
  "content_relevance": 0.0-1.0,
  "specificity": 0.0-1.0,
  "combined_passage": "key excerpts from across sections",
  "summary": "unified summary of how this document addresses the question",
  "suggested_response": "consolidated draft response citing the document"
}

Return ONLY the JSON object.`;

  return { system, user };
}

// ─── Analysis Engine ──────────────────────────────────────────────────────────

/**
 * Analyse a single chunk of document text against a set of questions.
 */
async function analyseChunk(
  documentTitle: string,
  evidenceType: string | null,
  chunk: DocumentChunkInput,
  questions: OntologyQuestion[],
  organisationContext: string
): Promise<{ matches: DocumentMatchResult[]; tokensUsed: number }> {
  const sanitisedContent = sanitiseTextForAI(chunk.content, documentTitle);
  const { system, user } = buildChunkAnalysisPrompt(
    documentTitle,
    evidenceType,
    sanitisedContent,
    questions,
    organisationContext
  );

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: user }],
  });

  const tokensUsed =
    (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

  const content = response.content[0];
  if (content.type !== "text") {
    return { matches: [], tokensUsed };
  }

  let rawMatches: any[];
  try {
    // Extract JSON from response — handle both bare array and markdown fenced
    let jsonText = content.text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    }
    const parsed = JSON.parse(jsonText);
    rawMatches = Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn(
      `[DocumentAnalyser] Failed to parse chunk analysis JSON for "${documentTitle}" chunk ${chunk.chunkIndex}`
    );
    return { matches: [], tokensUsed };
  }

  const matches: DocumentMatchResult[] = rawMatches
    .filter(
      (m: any) =>
        typeof m.question_id === "number" &&
        typeof m.content_relevance === "number"
    )
    .map((m: any) => {
      const contentRelevance = Math.max(0, Math.min(1, m.content_relevance));
      const specificity = Math.max(0, Math.min(1, m.specificity || 0));
      const evidenceTypeMatch = !!m.evidence_type_match;
      const compositeScore = calculateCompositeScore(
        contentRelevance,
        evidenceTypeMatch,
        specificity
      );

      return {
        questionId: m.question_id,
        contentRelevance,
        evidenceTypeMatch,
        specificity,
        compositeScore,
        matchedPassage: m.matched_passage || "",
        aiSummary: m.summary || "",
        suggestedResponse: m.suggested_response || "",
        confidenceNotes: m.confidence_notes || "",
        chunkIndex: chunk.chunkIndex,
        chunkId: chunk.chunkId,
      };
    });

  return { matches, tokensUsed };
}

/**
 * Perform fusion re-scoring when multiple chunks match the same question.
 */
async function fusionReScore(
  documentTitle: string,
  questionText: string,
  existingMatches: DocumentMatchResult[],
  evidenceTypeMatch: boolean
): Promise<{ fusedMatch: DocumentMatchResult; tokensUsed: number }> {
  const passages = existingMatches.map((m) => m.matchedPassage);
  const summaries = existingMatches.map((m) => m.aiSummary);

  const { system, user } = buildFusionPrompt(
    documentTitle,
    questionText,
    passages,
    summaries
  );

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: user }],
  });

  const tokensUsed =
    (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

  const content = response.content[0];
  let fusedData: any = {};

  if (content.type === "text") {
    try {
      let jsonText = content.text.trim();
      const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        jsonText = fenceMatch[1].trim();
      }
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        fusedData = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.warn(
        `[DocumentAnalyser] Failed to parse fusion JSON for "${documentTitle}"`
      );
    }
  }

  // Use fused scores, fall back to max of existing
  const contentRelevance = Math.max(
    0,
    Math.min(1, fusedData.content_relevance ?? Math.max(...existingMatches.map((m) => m.contentRelevance)))
  );
  const specificity = Math.max(
    0,
    Math.min(1, fusedData.specificity ?? Math.max(...existingMatches.map((m) => m.specificity)))
  );
  const compositeScore = calculateCompositeScore(
    contentRelevance,
    evidenceTypeMatch,
    specificity
  );

  // Pick the chunk with highest original score for the chunkId reference
  const bestChunk = existingMatches.reduce((a, b) =>
    a.compositeScore >= b.compositeScore ? a : b
  );

  const fusedMatch: DocumentMatchResult = {
    questionId: existingMatches[0].questionId,
    contentRelevance,
    evidenceTypeMatch,
    specificity,
    compositeScore,
    matchedPassage:
      fusedData.combined_passage ||
      existingMatches.map((m) => m.matchedPassage).join("\n\n---\n\n"),
    aiSummary: fusedData.summary || existingMatches.map((m) => m.aiSummary).join(" "),
    suggestedResponse:
      fusedData.suggested_response || bestChunk.suggestedResponse,
    confidenceNotes: `Fused from ${existingMatches.length} document sections`,
    chunkIndex: bestChunk.chunkIndex,
    chunkId: bestChunk.chunkId,
  };

  return { fusedMatch, tokensUsed };
}

// ─── Main Analysis Function ──────────────────────────────────────────────────

/**
 * Analyse a document against all questions for a control.
 *
 * @param documentTitle   - Title of the document being analysed
 * @param evidenceType    - Document's evidence type (POLICY, REGISTER, etc.)
 * @param chunks          - Pre-chunked document text
 * @param questions       - Ontology questions for the control
 * @param organisationContext - Org context string for the AI prompt
 * @param onProgress      - Callback for streaming progress updates
 * @param onMatch         - Callback for each match found (real-time)
 */
export async function analyseDocumentForControl(
  documentTitle: string,
  evidenceType: string | null,
  chunks: DocumentChunkInput[],
  questions: OntologyQuestion[],
  organisationContext: string,
  onProgress?: (progress: AnalysisProgress) => void,
  onMatch?: (match: DocumentMatchResult & { strengthLabel: string }) => void
): Promise<{
  matches: DocumentMatchResult[];
  totalTokensUsed: number;
  summary: AnalysisCompleteResult;
}> {
  if (chunks.length === 0 || questions.length === 0) {
    return {
      matches: [],
      totalTokensUsed: 0,
      summary: {
        totalMatches: 0,
        strongMatches: 0,
        partialMatches: 0,
        weakMatches: 0,
        evidenceGaps: questions.length,
        pendingSuggestions: 0,
      },
    };
  }

  let totalTokensUsed = 0;
  // Map: questionId → array of matches from different chunks
  const matchesByQuestion = new Map<number, DocumentMatchResult[]>();

  // ─── Phase: Analyse each chunk ────────────────────────────────────────────
  for (let i = 0; i < chunks.length; i++) {
    onProgress?.({
      phase: "analysing",
      current: i + 1,
      total: chunks.length,
      message: `Analysing section ${i + 1} of ${chunks.length}...`,
    });

    const { matches, tokensUsed } = await analyseChunk(
      documentTitle,
      evidenceType,
      chunks[i],
      questions,
      organisationContext
    );
    totalTokensUsed += tokensUsed;

    // Group matches by question
    for (const match of matches) {
      const existing = matchesByQuestion.get(match.questionId) || [];
      existing.push(match);
      matchesByQuestion.set(match.questionId, existing);

      // Emit match event in real-time
      onMatch?.({
        ...match,
        strengthLabel: getStrengthLabel(match.compositeScore),
      });
    }
  }

  // ─── Phase: Fusion re-scoring ─────────────────────────────────────────────
  const finalMatches: DocumentMatchResult[] = [];
  const questionsForFusion = Array.from(matchesByQuestion.entries()).filter(
    ([, matches]) => matches.length >= 2
  );

  if (questionsForFusion.length > 0) {
    onProgress?.({
      phase: "fusion",
      current: 0,
      total: questionsForFusion.length,
      message: `Re-scoring ${questionsForFusion.length} multi-section matches...`,
    });

    for (let i = 0; i < questionsForFusion.length; i++) {
      const [questionId, matches] = questionsForFusion[i];
      const question = questions.find((q) => q.question_id === questionId);
      if (!question) {
        // Keep the best single match
        const best = matches.reduce((a, b) =>
          a.compositeScore >= b.compositeScore ? a : b
        );
        finalMatches.push(best);
        continue;
      }

      onProgress?.({
        phase: "fusion",
        current: i + 1,
        total: questionsForFusion.length,
        message: `Re-scoring Q${questionId}...`,
      });

      const { fusedMatch, tokensUsed } = await fusionReScore(
        documentTitle,
        question.question,
        matches,
        matches[0].evidenceTypeMatch
      );
      totalTokensUsed += tokensUsed;
      finalMatches.push(fusedMatch);

      // Emit the fused match
      onMatch?.({
        ...fusedMatch,
        strengthLabel: getStrengthLabel(fusedMatch.compositeScore),
      });
    }
  }

  // Add single-chunk matches (no fusion needed)
  for (const [questionId, matches] of Array.from(matchesByQuestion.entries())) {
    if (matches.length === 1) {
      finalMatches.push(matches[0]);
    }
  }

  // ─── Compute summary ─────────────────────────────────────────────────────
  const strongMatches = finalMatches.filter((m) => m.compositeScore >= 0.85).length;
  const partialMatches = finalMatches.filter(
    (m) => m.compositeScore >= 0.7 && m.compositeScore < 0.85
  ).length;
  const weakMatches = finalMatches.filter(
    (m) => m.compositeScore >= 0.5 && m.compositeScore < 0.7
  ).length;

  // Evidence gaps: questions with no matches at all
  const matchedQuestionIds = new Set(finalMatches.map((m) => m.questionId));
  const evidenceGaps = questions.filter(
    (q) => !matchedQuestionIds.has(q.question_id)
  ).length;

  // Pending suggestions: matches ≥ 0.5 (these will have userAccepted = NULL)
  const pendingSuggestions = finalMatches.filter(
    (m) => m.compositeScore >= 0.5
  ).length;

  const summary: AnalysisCompleteResult = {
    totalMatches: finalMatches.length,
    strongMatches,
    partialMatches,
    weakMatches,
    evidenceGaps,
    pendingSuggestions,
  };

  onProgress?.({
    phase: "complete",
    current: finalMatches.length,
    total: questions.length,
    message: `Analysis complete: ${strongMatches} strong, ${partialMatches} partial, ${weakMatches} weak matches`,
  });

  return { matches: finalMatches, totalTokensUsed, summary };
}
