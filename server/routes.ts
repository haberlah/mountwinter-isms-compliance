import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { generateQuestionnaire, analyzeTestResponse, DEFAULT_MODEL, AIConfigurationError, checkAIConfiguration } from "./ai";
import { insertTestRunSchema, type Persona, type ImplementationResponses, type QuestionResponse } from "@shared/schema";
import { z } from "zod";

const personaSchema = z.enum(["Auditor", "Advisor", "Analyst"]);

const questionResponseSchema = z.object({
  question_id: z.number(),
  response_text: z.string(),
  evidence_references: z.array(z.string()).default([]),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed database on startup
  try {
    await seedDatabase();
  } catch (error) {
    console.error("Error seeding database:", error);
  }

  // Check AI configuration on startup
  const aiConfig = checkAIConfiguration();
  if (!aiConfig.configured) {
    console.warn("⚠️  AI Configuration Warning:", aiConfig.message);
    console.warn("   AI features (questionnaire generation, test analysis) will not work until this is resolved.");
  } else {
    console.log("✓ AI service configured");
  }

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Controls
  app.get("/api/controls", async (req, res) => {
    try {
      const controls = await storage.getControlsWithLatestTest();
      res.json(controls);
    } catch (error) {
      console.error("Error fetching controls:", error);
      res.status(500).json({ error: "Failed to fetch controls" });
    }
  });

  // Controls stats
  app.get("/api/controls/stats", async (req, res) => {
    try {
      const stats = await storage.getControlsStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching controls stats:", error);
      res.status(500).json({ error: "Failed to fetch controls stats" });
    }
  });

  app.get("/api/controls/:controlNumber", async (req, res) => {
    try {
      const control = await storage.getControlByNumber(req.params.controlNumber);
      if (!control) {
        return res.status(404).json({ error: "Control not found" });
      }
      res.json(control);
    } catch (error) {
      console.error("Error fetching control:", error);
      res.status(500).json({ error: "Failed to fetch control" });
    }
  });

  // Generate questionnaire for a control
  app.post("/api/controls/:controlNumber/generate-questionnaire", async (req, res) => {
    try {
      const control = await storage.getControlByNumber(req.params.controlNumber);
      if (!control) {
        return res.status(404).json({ error: "Control not found" });
      }

      const user = await storage.getOrCreateDefaultUser();

      const { questionnaire, tokensUsed } = await generateQuestionnaire(
        control.controlNumber,
        control.name,
        control.description || ""
      );

      // Update control with questionnaire
      await storage.updateControlQuestionnaire(control.id, questionnaire, new Date());

      // Log AI interaction
      await storage.createAiInteraction({
        userId: user.id,
        interactionType: "questionnaire_generation",
        controlId: control.id,
        inputSummary: `Generated questionnaire for ${control.controlNumber}: ${control.name}`,
        outputSummary: `Generated ${questionnaire.questions.length} questions`,
        modelUsed: DEFAULT_MODEL,
        tokensUsed,
      });

      res.json({ success: true, questionnaire });
    } catch (error) {
      console.error("Error generating questionnaire:", error);
      if (error instanceof AIConfigurationError) {
        return res.status(502).json({ 
          error: "AI service configuration error", 
          message: error.message 
        });
      }
      res.status(500).json({ error: "Failed to generate questionnaire" });
    }
  });

  // Analyze test response
  app.post("/api/controls/:controlNumber/analyze", async (req, res) => {
    try {
      const control = await storage.getControlByNumber(req.params.controlNumber);
      if (!control) {
        return res.status(404).json({ error: "Control not found" });
      }

      const { comments } = req.body;
      if (!comments || typeof comments !== "string") {
        return res.status(400).json({ error: "Comments are required" });
      }

      const user = await storage.getOrCreateDefaultUser();

      const { analysis, tokensUsed } = await analyzeTestResponse(
        control.controlNumber,
        control.name,
        control.description || "",
        comments,
        control.aiQuestionnaire || undefined
      );

      // Log AI interaction
      await storage.createAiInteraction({
        userId: user.id,
        interactionType: "test_analysis",
        controlId: control.id,
        inputSummary: comments.substring(0, 200) + (comments.length > 200 ? "..." : ""),
        outputSummary: `Suggested: ${analysis.suggestedStatus} (${(analysis.confidence * 100).toFixed(0)}% confidence)`,
        modelUsed: DEFAULT_MODEL,
        tokensUsed,
      });

      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing response:", error);
      if (error instanceof AIConfigurationError) {
        return res.status(502).json({ 
          error: "AI service configuration error", 
          message: error.message 
        });
      }
      res.status(500).json({ error: "Failed to analyze response" });
    }
  });

  // Organisation Controls
  app.patch("/api/organisation-controls/:controlId", async (req, res) => {
    try {
      const controlId = parseInt(req.params.controlId);
      if (isNaN(controlId)) {
        return res.status(400).json({ error: "Invalid control ID" });
      }

      const { isApplicable, frequency, exclusionJustification, startQuarter } = req.body;

      // Calculate next due date based on frequency and start quarter
      const calculateNextDueDate = (freq: string, quarter: string): string | null => {
        if (!freq) return null;
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed
        
        // Quarter start months (0-indexed): Q1=Jan(0), Q2=Apr(3), Q3=Jul(6), Q4=Oct(9)
        const quarterMonths: Record<string, number> = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 };
        const startMonth = quarterMonths[quarter] ?? 0;
        
        let nextDueDate: Date = new Date();
        
        switch (freq) {
          case "Annual":
            // Next occurrence of start quarter
            nextDueDate = new Date(currentYear, startMonth, 1);
            if (nextDueDate <= now) {
              nextDueDate = new Date(currentYear + 1, startMonth, 1);
            }
            break;
          case "Quarterly":
            // Find next occurrence of start quarter month or any subsequent quarter
            const quarterMonthsList = [0, 3, 6, 9]; // Q1, Q2, Q3, Q4 months
            const startQuarterIndex = quarterMonthsList.indexOf(startMonth);
            // Find the next quarter from the start quarter pattern
            let foundNextQuarter = false;
            for (let i = 0; i < 4; i++) {
              const checkMonth = quarterMonthsList[(startQuarterIndex + i) % 4];
              const checkYear = checkMonth < quarterMonthsList[startQuarterIndex] ? currentYear + 1 : currentYear;
              const checkDate = new Date(checkYear, checkMonth, 1);
              if (checkDate > now) {
                nextDueDate = checkDate;
                foundNextQuarter = true;
                break;
              }
            }
            if (!foundNextQuarter) {
              // All quarters this year have passed, use start quarter next year
              nextDueDate = new Date(currentYear + 1, startMonth, 1);
            }
            break;
          case "Monthly":
            // First day of next month
            nextDueDate = new Date(currentYear, currentMonth + 1, 1);
            break;
          default:
            return null;
        }
        
        return nextDueDate.toISOString().split('T')[0];
      };

      const effectiveFrequency = frequency || null;
      const effectiveStartQuarter = startQuarter || "Q1";
      const nextDueDate = effectiveFrequency ? calculateNextDueDate(effectiveFrequency, effectiveStartQuarter) : null;

      // Check if organisation control exists, if not create it
      let orgControl = await storage.getOrganisationControl(controlId);
      if (!orgControl) {
        orgControl = await storage.createOrganisationControl({
          controlId,
          isApplicable: isApplicable ?? true,
          frequency: effectiveFrequency,
          startQuarter: startQuarter || null,
          exclusionJustification: exclusionJustification || null,
          nextDueDate,
        });
      } else {
        orgControl = await storage.updateOrganisationControl(controlId, {
          isApplicable: isApplicable ?? orgControl.isApplicable,
          frequency: effectiveFrequency || orgControl.frequency,
          exclusionJustification: exclusionJustification ?? orgControl.exclusionJustification,
          startQuarter: startQuarter || orgControl.startQuarter,
          nextDueDate,
        });
      }

      res.json(orgControl);
    } catch (error) {
      console.error("Error updating organisation control:", error);
      res.status(500).json({ error: "Failed to update organisation control" });
    }
  });

  // Test Runs
  app.get("/api/test-runs", async (req, res) => {
    try {
      const testRuns = await storage.getTestRuns();
      res.json(testRuns);
    } catch (error) {
      console.error("Error fetching test runs:", error);
      res.status(500).json({ error: "Failed to fetch test runs" });
    }
  });

  app.post("/api/test-runs", async (req, res) => {
    try {
      const user = await storage.getOrCreateDefaultUser();

      const { organisationControlId, status, comments, aiAnalysis, aiSuggestedStatus, aiConfidence, aiContextScope } = req.body;

      if (!organisationControlId) {
        return res.status(400).json({ error: "Organisation control ID is required" });
      }

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const testRun = await storage.createTestRun({
        organisationControlId,
        testerUserId: user.id,
        status,
        comments: comments || null,
        aiAnalysis: aiAnalysis || null,
        aiSuggestedStatus: aiSuggestedStatus || null,
        aiConfidence: aiConfidence || null,
        aiContextScope: aiContextScope || null,
      });

      res.status(201).json(testRun);
    } catch (error) {
      console.error("Error creating test run:", error);
      res.status(500).json({ error: "Failed to create test run" });
    }
  });

  // AI Interactions
  app.get("/api/ai-interactions", async (req, res) => {
    try {
      const interactions = await storage.getAiInteractions();
      res.json(interactions);
    } catch (error) {
      console.error("Error fetching AI interactions:", error);
      res.status(500).json({ error: "Failed to fetch AI interactions" });
    }
  });

  // Update selected persona for an organisation control
  app.patch("/api/organisation-controls/:controlId/persona", async (req, res) => {
    try {
      const controlId = parseInt(req.params.controlId);
      if (isNaN(controlId)) {
        return res.status(400).json({ error: "Invalid control ID" });
      }

      const parseResult = personaSchema.safeParse(req.body.persona);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid persona. Must be 'Auditor', 'Advisor', or 'Analyst'" });
      }

      const persona = parseResult.data;

      let orgControl = await storage.getOrganisationControl(controlId);
      if (!orgControl) {
        orgControl = await storage.createOrganisationControl({
          controlId,
          isApplicable: true,
          selectedPersona: persona,
        });
      } else {
        orgControl = await storage.updateOrganisationControl(controlId, {
          selectedPersona: persona,
        });
      }

      // Log AI interaction for persona view
      const user = await storage.getOrCreateDefaultUser();
      const control = await storage.getControlById(controlId);
      if (control) {
        await storage.createAiInteraction({
          userId: user.id,
          interactionType: "questionnaire_generation",
          controlId: control.id,
          inputSummary: `Viewed questionnaire for ${control.controlNumber}`,
          outputSummary: `Persona changed to ${persona}`,
          modelUsed: "ontology-preloaded",
          tokensUsed: 0,
        });
      }

      res.json({ success: true, selected_persona: persona });
    } catch (error) {
      console.error("Error updating persona:", error);
      res.status(500).json({ error: "Failed to update persona" });
    }
  });

  // Save a single question response (merges into existing implementation_responses)
  app.patch("/api/organisation-controls/:controlId/response", async (req, res) => {
    try {
      const controlId = parseInt(req.params.controlId);
      if (isNaN(controlId)) {
        return res.status(400).json({ error: "Invalid control ID" });
      }

      const parseResult = questionResponseSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid response data", details: parseResult.error });
      }

      const { question_id, response_text, evidence_references } = parseResult.data;
      const user = await storage.getOrCreateDefaultUser();

      let orgControl = await storage.getOrganisationControl(controlId);
      if (!orgControl) {
        orgControl = await storage.createOrganisationControl({
          controlId,
          isApplicable: true,
        });
      }

      // Get existing responses or create new structure
      const existingResponses: ImplementationResponses = orgControl.implementationResponses || {
        responses: [],
        completion_status: {
          total: 0,
          answered: 0,
          by_persona: {
            Auditor: { total: 0, answered: 0 },
            Advisor: { total: 0, answered: 0 },
            Analyst: { total: 0, answered: 0 },
          },
        },
      };

      // Find or create response for this question
      const existingIndex = existingResponses.responses.findIndex(
        (r) => r.question_id === question_id
      );

      const newResponse: QuestionResponse = {
        question_id,
        response_text,
        evidence_references,
        last_updated: new Date().toISOString(),
        answered_by_user_id: user.id,
      };

      if (existingIndex >= 0) {
        existingResponses.responses[existingIndex] = newResponse;
      } else {
        existingResponses.responses.push(newResponse);
      }

      // Update answered count
      existingResponses.completion_status.answered = existingResponses.responses.filter(
        (r) => r.response_text.trim().length > 0
      ).length;

      // Update the organisation control
      const updated = await storage.updateOrganisationControl(controlId, {
        implementationResponses: existingResponses,
        implementationUpdatedAt: new Date(),
      });

      res.json({ success: true, response: newResponse });
    } catch (error) {
      console.error("Error saving response:", error);
      res.status(500).json({ error: "Failed to save response" });
    }
  });

  // Add evidence to a question response
  app.patch("/api/organisation-controls/:controlId/response/:questionId/evidence", async (req, res) => {
    try {
      const controlId = parseInt(req.params.controlId);
      const questionId = parseInt(req.params.questionId);
      
      if (isNaN(controlId) || isNaN(questionId)) {
        return res.status(400).json({ error: "Invalid control or question ID" });
      }

      const { filename } = req.body;
      if (!filename || typeof filename !== "string") {
        return res.status(400).json({ error: "Filename is required" });
      }

      const user = await storage.getOrCreateDefaultUser();
      let orgControl = await storage.getOrganisationControl(controlId);
      
      if (!orgControl) {
        return res.status(404).json({ error: "Organisation control not found" });
      }

      const existingResponses: ImplementationResponses = orgControl.implementationResponses || {
        responses: [],
        completion_status: {
          total: 0,
          answered: 0,
          by_persona: {
            Auditor: { total: 0, answered: 0 },
            Advisor: { total: 0, answered: 0 },
            Analyst: { total: 0, answered: 0 },
          },
        },
      };

      const existingIndex = existingResponses.responses.findIndex(
        (r) => r.question_id === questionId
      );

      if (existingIndex >= 0) {
        const existing = existingResponses.responses[existingIndex];
        if (!existing.evidence_references.includes(filename)) {
          existing.evidence_references.push(filename);
          existing.last_updated = new Date().toISOString();
        }
      } else {
        existingResponses.responses.push({
          question_id: questionId,
          response_text: "",
          evidence_references: [filename],
          last_updated: new Date().toISOString(),
          answered_by_user_id: user.id,
        });
      }

      const updated = await storage.updateOrganisationControl(controlId, {
        implementationResponses: existingResponses,
        implementationUpdatedAt: new Date(),
      });

      res.json({ success: true, evidence_references: existingResponses.responses.find(r => r.question_id === questionId)?.evidence_references || [] });
    } catch (error) {
      console.error("Error adding evidence:", error);
      res.status(500).json({ error: "Failed to add evidence" });
    }
  });

  return httpServer;
}
