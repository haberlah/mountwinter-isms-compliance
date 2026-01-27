import Anthropic from "@anthropic-ai/sdk";

// claude-sonnet-4-5-20250929 is the model requested by the user
export const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export class AIConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIConfigurationError";
  }
}

export function checkAIConfiguration(): { configured: boolean; message: string } {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { configured: false, message: "ANTHROPIC_API_KEY is not set" };
  }
  if (process.env.ANTHROPIC_API_KEY.length < 20) {
    return { configured: false, message: "ANTHROPIC_API_KEY appears to be invalid (too short)" };
  }
  return { configured: true, message: "AI service configured" };
}

export interface QuestionnaireQuestion {
  id: string;
  question: string;
  type: "text" | "boolean" | "scale";
  guidance?: string;
}

export interface Questionnaire {
  questions: QuestionnaireQuestion[];
}

export interface AnalysisResult {
  suggestedStatus: "Pass" | "Fail" | "Blocked" | "NotAttempted";
  confidence: number;
  reasoning: string;
  recommendations: string[];
}

export async function generateQuestionnaire(
  controlNumber: string,
  controlName: string,
  controlDescription: string
): Promise<{ questionnaire: Questionnaire; tokensUsed: number }> {
  const prompt = `You are an ISO 27001:2022 compliance expert. Generate a comprehensive assessment questionnaire for the following security control.

Control Number: ${controlNumber}
Control Name: ${controlName}
Control Description: ${controlDescription}

Generate 5-7 specific questions that an auditor should ask to assess compliance with this control. Each question should:
1. Be directly relevant to the control requirements
2. Help determine if the control is effectively implemented
3. Seek evidence of implementation

Return your response as a JSON object with the following structure:
{
  "questions": [
    {
      "id": "q1",
      "question": "The specific question to ask",
      "type": "text" | "boolean" | "scale",
      "guidance": "Optional guidance on what constitutes a good answer"
    }
  ]
}

Use "boolean" for yes/no questions, "scale" for rating questions (1-5), and "text" for open-ended questions.
Return ONLY the JSON object, no additional text.`;

  let response;
  try {
    response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (error: any) {
    if (error?.status === 401 || error?.message?.includes("invalid x-api-key") || error?.message?.includes("401")) {
      throw new AIConfigurationError("AI service is not configured correctly. Please check that ANTHROPIC_API_KEY is valid.");
    }
    throw error;
  }

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  // Parse the JSON response
  let questionnaire: Questionnaire;
  try {
    // Try to extract JSON from the response (in case there's extra text)
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    questionnaire = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("Failed to parse questionnaire JSON:", content.text);
    throw new Error("Failed to parse AI response as JSON");
  }

  const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

  return { questionnaire, tokensUsed };
}

// Types for persona-aware analysis
export type Persona = 'Auditor' | 'Advisor' | 'Analyst';

export interface OntologyQuestion {
  question_id: number;
  question: string;
  guidance: string;
  auditor_focus: string;
  evidence_type: string;
  what_good_looks_like: string;
  red_flags: string;
  nc_pattern: string;
  related_controls: string;
}

export interface QuestionResponse {
  question_id: number;
  response_text: string;
  evidence_references: string[];
}

export interface TestRunHistory {
  testDate: string;
  status: string;
  comments: string | null;
}

export interface PersonaAnalysisResult {
  assessment: string;
  suggested_status: 'Pass' | 'Fail' | 'ContinualImprovement' | 'NotAttempted';
  confidence: number;
  observations: string[];
  recommendations: string[];
  persona_specific: Record<string, unknown>;
}

export function buildAnalysisSystemPrompt(
  persona: Persona,
  controlNumber: string,
  controlName: string,
  questions: OntologyQuestion[]
): string {
  const basePrompt = `You are an ISO 27001:2022 compliance ${persona.toLowerCase()} analyzing responses for control ${controlNumber}: ${controlName}.

Your task is to evaluate whether the responses demonstrate adequate implementation and suggest an appropriate test status.`;

  const personaPrompts: Record<Persona, string> = {
    Auditor: `
As an AUDITOR, your role is evidence verification. You must:
1. Verify each response against the expected evidence type
2. Check for RED FLAGS - explicitly call out any that apply:
${questions.map(q => `   - Q${q.question_id}: ${q.red_flags}`).join('\n')}
3. Reference NC (non-conformity) patterns when issues found
4. Be direct about documentation gaps
5. Consider if an external certification auditor would accept this evidence

Evaluation criteria per question:
${questions.map(q => `Q${q.question_id} - Auditor Focus: ${q.auditor_focus}`).join('\n')}

Your assessment should read like an audit observation.

Include in persona_specific:
- red_flags_triggered: array of red flags that were triggered
- nc_risk_areas: array of non-conformity risk areas
- evidence_gaps: array of evidence gaps identified
- audit_opinion: brief audit opinion statement`,

    Advisor: `
As an ADVISOR, your role is improvement guidance. You must:
1. Compare responses to "what good looks like":
${questions.map(q => `   - Q${q.question_id}: ${q.what_good_looks_like}`).join('\n')}
2. Identify improvement opportunities constructively
3. Consider related controls for holistic recommendations: 
${Array.from(new Set(questions.map(q => q.related_controls).filter(Boolean))).join(', ')}
4. Assess maturity level (Initial/Developing/Defined/Managed/Optimized)
5. Balance critique with recognition of strengths

Your assessment should read like a consulting recommendation.

Include in persona_specific:
- improvement_opportunities: prioritized array of improvements
- maturity_assessment: maturity level with brief explanation
- related_controls_to_review: array of related control numbers
- quick_wins: array of easy improvements to implement`,

    Analyst: `
As an ANALYST, your role is quantitative assessment. You must:
1. Score each response against its criteria (met/partial/not met)
2. Calculate overall compliance percentage
3. Quantify gaps with specific counts and percentages
4. Identify measurable improvement areas
5. Suggest KPIs for ongoing monitoring

Evaluation criteria counts:
${questions.map(q => {
  const criteria = q.what_good_looks_like.split(' and ').length;
  return `Q${q.question_id}: ${criteria} criteria`;
}).join('\n')}

Your assessment should read like a data-driven report.

Include in persona_specific:
- compliance_score: number 0-100
- criteria_met: count of criteria met
- criteria_total: total criteria count
- gap_analysis: array of {criterion, status, weight}
- suggested_kpis: array of KPI suggestions`
  };

  return `${basePrompt}\n${personaPrompts[persona]}`;
}

export function buildAnalysisUserMessage(
  questions: OntologyQuestion[],
  responses: QuestionResponse[],
  comments: string,
  previousTests?: TestRunHistory[]
): string {
  let message = `## Questionnaire Responses\n\n`;
  
  for (const q of questions) {
    const response = responses.find(r => r.question_id === q.question_id);
    message += `### Q${q.question_id}: ${q.question}\n`;
    message += `Expected evidence: ${q.evidence_type}\n`;
    message += `Response: ${response?.response_text || '(No response provided)'}\n`;
    if (response?.evidence_references?.length) {
      message += `Evidence cited: ${response.evidence_references.join(', ')}\n`;
    }
    message += `\n`;
  }
  
  message += `## Tester Comments\n${comments || '(None provided)'}\n\n`;
  
  if (previousTests?.length) {
    message += `## Previous Test History\n`;
    for (const test of previousTests.slice(0, 3)) {
      message += `- ${test.testDate}: ${test.status}`;
      if (test.comments) message += ` - "${test.comments}"`;
      message += `\n`;
    }
  }
  
  message += `\n## Required Output Format
Provide your analysis as JSON:
{
  "assessment": "2-3 sentence overall assessment",
  "suggested_status": "Pass|Fail|ContinualImprovement|NotAttempted",
  "confidence": 0.0-1.0,
  "observations": ["observation 1", "observation 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "persona_specific": { /* persona-specific fields as described above */ }
}`;

  return message;
}

export async function streamAnalysis(
  persona: Persona,
  controlNumber: string,
  controlName: string,
  questions: OntologyQuestion[],
  responses: QuestionResponse[],
  comments: string,
  previousTests?: TestRunHistory[],
  onToken?: (text: string) => void
): Promise<{ analysis: PersonaAnalysisResult; tokensUsed: number; fullText: string }> {
  const systemPrompt = buildAnalysisSystemPrompt(persona, controlNumber, controlName, questions);
  const userMessage = buildAnalysisUserMessage(questions, responses, comments, previousTests);

  const stream = await anthropic.messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  });

  let fullText = '';
  
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && 'delta' in event) {
      const delta = event.delta as { text?: string };
      if (delta.text) {
        fullText += delta.text;
        onToken?.(delta.text);
      }
    }
  }

  const finalMessage = await stream.finalMessage();
  const tokensUsed = (finalMessage.usage?.input_tokens || 0) + (finalMessage.usage?.output_tokens || 0);

  // Parse JSON from response
  let analysis: PersonaAnalysisResult;
  try {
    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    // Normalize camelCase to snake_case if needed (AI sometimes ignores prompt formatting)
    analysis = {
      assessment: parsed.assessment || "",
      suggested_status: parsed.suggested_status || parsed.suggestedStatus || 'NotAttempted',
      confidence: parsed.confidence || 0.5,
      observations: parsed.observations || [],
      recommendations: parsed.recommendations || [],
      persona_specific: parsed.persona_specific || parsed.personaSpecific || {}
    };
  } catch (e) {
    console.error('Failed to parse analysis JSON:', fullText);
    // Return a default structure if parsing fails
    analysis = {
      assessment: fullText.substring(0, 500),
      suggested_status: 'NotAttempted',
      confidence: 0.5,
      observations: ['Analysis parsing failed - please review raw text'],
      recommendations: ['Re-run analysis or review responses manually'],
      persona_specific: {}
    };
  }

  return { analysis, tokensUsed, fullText };
}

export async function analyzeTestResponse(
  controlNumber: string,
  controlName: string,
  controlDescription: string,
  comments: string,
  questionnaire?: Questionnaire
): Promise<{ analysis: AnalysisResult; tokensUsed: number }> {
  const questionContext = questionnaire
    ? `\n\nThe assessment questionnaire for this control includes:\n${questionnaire.questions.map((q) => `- ${q.question}`).join("\n")}`
    : "";

  const prompt = `You are an ISO 27001:2022 compliance expert. Analyze the following test response and determine the compliance status.

Control Number: ${controlNumber}
Control Name: ${controlName}
Control Description: ${controlDescription}
${questionContext}

Tester's Comments and Evidence:
${comments}

Based on the tester's response, analyze whether the control appears to be:
- Pass: Control is effectively implemented with adequate evidence
- Fail: Control is not implemented or has significant gaps
- Blocked: Testing could not be completed due to external factors
- NotAttempted: Insufficient information provided to make a determination

Return your analysis as a JSON object:
{
  "suggestedStatus": "Pass" | "Fail" | "Blocked" | "NotAttempted",
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation of why this status is suggested",
  "recommendations": ["List of recommendations for improvement or next steps"]
}

Return ONLY the JSON object, no additional text.`;

  let response;
  try {
    response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (error: any) {
    if (error?.status === 401 || error?.message?.includes("invalid x-api-key") || error?.message?.includes("401")) {
      throw new AIConfigurationError("AI service is not configured correctly. Please check that ANTHROPIC_API_KEY is valid.");
    }
    throw error;
  }

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  let analysis: AnalysisResult;
  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    analysis = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("Failed to parse analysis JSON:", content.text);
    throw new Error("Failed to parse AI response as JSON");
  }

  const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

  return { analysis, tokensUsed };
}
