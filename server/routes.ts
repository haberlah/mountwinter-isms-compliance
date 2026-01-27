import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { generateQuestionnaire, analyzeTestResponse, DEFAULT_MODEL, AIConfigurationError, checkAIConfiguration } from "./ai";
import { insertTestRunSchema } from "@shared/schema";
import { z } from "zod";

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

      // Check if organisation control exists, if not create it
      let orgControl = await storage.getOrganisationControl(controlId);
      if (!orgControl) {
        orgControl = await storage.createOrganisationControl({
          controlId,
          isApplicable: isApplicable ?? true,
          frequency: frequency || null,
          startQuarter: startQuarter || null,
          exclusionJustification: exclusionJustification || null,
        });
      } else {
        orgControl = await storage.updateOrganisationControl(controlId, {
          isApplicable: isApplicable ?? orgControl.isApplicable,
          frequency: frequency || orgControl.frequency,
          exclusionJustification: exclusionJustification ?? orgControl.exclusionJustification,
          startQuarter: startQuarter || orgControl.startQuarter,
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

  return httpServer;
}
