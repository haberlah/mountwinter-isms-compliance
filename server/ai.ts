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
