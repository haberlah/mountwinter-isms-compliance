import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { generateQuestionnaire, analyzeTestResponse, DEFAULT_MODEL, AIConfigurationError, checkAIConfiguration, streamAnalysis, buildOrganisationContextSection, type OntologyQuestion as AIQuestion, type QuestionResponse as AIQuestionResponse, type TestRunHistory } from "./ai";
import { insertTestRunSchema, type Persona, type ImplementationResponses, type QuestionResponse, type ControlQuestionnaire, type OntologyQuestion, type User } from "@shared/schema";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { upload } from "./upload";
import { isStorageConfigured, generateStorageKey, uploadFile, downloadFile, deleteFile, checkStorageConnection, getBackendName } from "./storage-backend";
import { computeFileHash, extractText, sanitiseTextForAI, chunkText } from "./document-processor";
import { analyseDocumentForControl, type DocumentChunkInput } from "./document-analyser";
import { isAuthenticated } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import { organisationControls as organisationControlsTable, evidenceLinks as evidenceLinksTable } from "@shared/schema";
import { db } from "./db";
import { eq as drizzleEq, and as drizzleAnd } from "drizzle-orm";

const personaSchema = z.enum(["Auditor", "Advisor", "Analyst"]);

const questionResponseSchema = z.object({
  question_id: z.number(),
  response_text: z.string(),
  evidence_references: z.array(z.string()).default([]),
});

function getUserDisplayName(user: User): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown";
}

async function getAppUser(req: any): Promise<User | null> {
  const userId = req.user?.claims?.sub;
  if (!userId) return null;
  const user = await authStorage.getUser(userId);
  return user || null;
}

const requireOrg: RequestHandler = async (req: any, res, next) => {
  const user = await getAppUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!user.organisationId) {
    return res.status(403).json({ error: "You are not a member of any organisation" });
  }
  req.appUser = user;
  next();
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  try {
    await seedDatabase();
  } catch (error) {
    console.error("Error seeding database:", error);
  }

  const aiConfig = checkAIConfiguration();
  if (!aiConfig.configured) {
    console.warn("⚠️  AI Configuration Warning:", aiConfig.message);
    console.warn("   AI features (questionnaire generation, test analysis) will not work until this is resolved.");
  } else {
    console.log("✓ AI service configured");
  }

  if (isStorageConfigured()) {
    try {
      await checkStorageConnection();
      const backendName = await getBackendName();
      console.log(`✓ Document storage configured (${backendName})`);
    } catch (error) {
      console.warn("⚠️  Storage Configuration Warning:", (error as Error).message);
      console.warn("   Document upload features will not work until this is resolved.");
    }
  } else {
    console.warn("⚠️  Document storage not configured — document upload features disabled");
  }

  // ─── Document Repository CRUD ──────────────────────────────────────────────

  app.post("/api/documents/upload", isAuthenticated, requireOrg, upload.array("files", 10), async (req: any, res) => {
    try {
      if (!isStorageConfigured()) {
        return res.status(503).json({ error: "Document storage is not configured" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      const user = req.appUser as User;
      const orgId = user.organisationId!;
      const results: any[] = [];

      for (const file of files) {
        const fileHash = computeFileHash(file.buffer);
        const existing = await storage.getDocumentByHash(fileHash, orgId);

        if (existing) {
          results.push({ document: existing, isDuplicate: true });
          continue;
        }

        const storageKey = generateStorageKey(file.originalname);
        const uploadResult = await uploadFile(file.buffer, storageKey, file.mimetype);

        try {
          const document = await storage.createDocument({
            title: req.body.title || file.originalname.replace(/\.[^.]+$/, ""),
            originalFilename: file.originalname,
            s3Key: uploadResult.key,
            s3Bucket: uploadResult.bucket,
            mimeType: file.mimetype,
            fileSize: file.size,
            fileHash,
            evidenceType: req.body.evidenceType || null,
            description: req.body.description || null,
            documentDate: req.body.documentDate ? new Date(req.body.documentDate) : null,
            uploadedByUserId: user.id,
            extractionStatus: "pending",
            organisationId: orgId,
          });

          try {
            await storage.updateDocument(document.id, { extractionStatus: "extracting" });
            const { text, pageCount } = await extractText(file.buffer, file.mimetype);
            const sanitisedText = sanitiseTextForAI(text, file.originalname);

            const chunks = chunkText(sanitisedText);
            await storage.createDocumentChunks(
              document.id,
              chunks.map((c) => ({
                chunkIndex: c.chunkIndex,
                content: c.content,
                tokenCount: c.tokenCount,
                charStart: c.charStart,
                charEnd: c.charEnd,
                sectionHeading: c.sectionHeading,
              }))
            );

            await storage.updateDocument(document.id, {
              extractedText: sanitisedText,
              extractionStatus: "extracted",
              pageCount: pageCount || null,
            });

            const updatedDoc = await storage.getDocument(document.id);
            results.push({ document: updatedDoc || document, isDuplicate: false });
          } catch (extractError) {
            console.error(`[Routes] Text extraction failed for "${file.originalname}":`, extractError);
            await storage.updateDocument(document.id, {
              extractionStatus: "error",
              extractionError: (extractError as Error).message,
            });
            results.push({ document: await storage.getDocument(document.id), isDuplicate: false });
          }
        } catch (dbError) {
          console.error(`[Routes] DB insert failed, cleaning up storage key "${storageKey}":`, dbError);
          await deleteFile(storageKey).catch(() => {});
          throw dbError;
        }
      }

      res.status(201).json({ documents: results });
    } catch (error) {
      console.error("Error uploading documents:", error);
      res.status(500).json({ error: "Failed to upload documents" });
    }
  });

  app.get("/api/documents", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const user = req.appUser as User;
      const orgId = user.organisationId!;
      const search = req.query.search as string | undefined;
      const type = req.query.type as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);

      const { documents, total } = await storage.getAllDocuments(orgId, { search, type, page, limit });
      res.json({ documents, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/stats", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const user = req.appUser as User;
      const stats = await storage.getDocumentStats(user.organisationId!);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching document stats:", error);
      res.status(500).json({ error: "Failed to fetch document statistics" });
    }
  });

  app.get("/api/documents/:id", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }

      const user = req.appUser as User;
      const document = await storage.getDocument(id);
      if (!document || document.organisationId !== user.organisationId) {
        return res.status(404).json({ error: "Document not found" });
      }

      const staleWarning =
        document.documentDate &&
        Date.now() - new Date(document.documentDate).getTime() > 365 * 24 * 60 * 60 * 1000;

      res.json({ ...document, staleWarning: !!staleWarning });
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  app.get("/api/documents/:id/download", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }

      const user = req.appUser as User;
      const document = await storage.getDocument(id);
      if (!document || document.organisationId !== user.organisationId) {
        return res.status(404).json({ error: "Document not found" });
      }

      const buffer = await downloadFile(document.s3Key);
      res.set({
        "Content-Type": document.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(document.originalFilename)}"`,
        "Content-Length": buffer.length.toString(),
      });
      res.send(buffer);
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ error: "Failed to download document" });
    }
  });

  app.patch("/api/documents/:id", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }

      const user = req.appUser as User;
      const document = await storage.getDocument(id);
      if (!document || document.organisationId !== user.organisationId) {
        return res.status(404).json({ error: "Document not found" });
      }

      const { title, documentDate, evidenceType, description } = req.body;
      const updated = await storage.updateDocument(id, {
        ...(title !== undefined && { title }),
        ...(documentDate !== undefined && { documentDate: documentDate ? new Date(documentDate) : null }),
        ...(evidenceType !== undefined && { evidenceType }),
        ...(description !== undefined && { description }),
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  // Reset all assessment data (questionnaire responses, test history, AI logs)
  app.delete("/api/assessment/reset", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const user = req.appUser as User;
      const result = await storage.resetAssessmentData(user.organisationId!);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error resetting assessment data:", error);
      res.status(500).json({ error: "Failed to reset assessment data" });
    }
  });

  // Delete all documents (bulk clear)
  app.delete("/api/documents/all", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const user = req.appUser as User;
      const { deletedCount, s3Keys } = await storage.deleteAllDocuments(user.organisationId!);
      let storageCleanedCount = 0;
      for (const key of s3Keys) {
        try {
          await deleteFile(key);
          storageCleanedCount++;
        } catch (e) {
          console.warn(`[Routes] Failed to delete storage object "${key}":`, e);
        }
      }
      res.json({ success: true, deletedCount, storageCleanedCount });
    } catch (error) {
      console.error("Error clearing all documents:", error);
      res.status(500).json({ error: "Failed to clear documents" });
    }
  });

  app.delete("/api/documents/:id", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }

      const user = req.appUser as User;
      const document = await storage.getDocument(id);
      if (!document || document.organisationId !== user.organisationId) {
        return res.status(404).json({ error: "Document not found" });
      }

      const deleted = await storage.forceDeleteDocument(id);
      if (deleted) {
        await deleteFile(document.s3Key).catch((e) =>
          console.warn(`[Routes] Failed to delete storage object "${document.s3Key}":`, e)
        );
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // ─── Document-Control Linking & Analysis ──────────────────────────────────

  app.post(
    "/api/organisation-controls/:controlId/documents/upload",
    isAuthenticated, requireOrg,
    upload.array("files", 10),
    async (req: any, res) => {
      const controlId = parseInt(req.params.controlId as string);
      if (isNaN(controlId)) {
        return res.status(400).json({ error: "Invalid control ID" });
      }

      if (!isStorageConfigured()) {
        return res.status(503).json({ error: "Document storage is not configured" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      const user = req.appUser as User;
      const orgId = user.organisationId!;

      let orgControl = await storage.getOrganisationControl(controlId, orgId);
      if (!orgControl) {
        orgControl = await storage.createOrganisationControl({
          controlId,
          organisationId: orgId,
          isApplicable: true,
        });
      }

      const control = await storage.getControlById(controlId);
      if (!control) {
        return res.status(404).json({ error: "Control not found" });
      }

      const questionnaire = control.aiQuestionnaire as ControlQuestionnaire | null;
      if (!questionnaire || !questionnaire.questions || questionnaire.questions.length === 0) {
        return res.status(400).json({ error: "No questionnaire generated for this control. Generate one first." });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      try {
        for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
          const file = files[fileIdx];
          res.write(
            `event: progress\ndata: ${JSON.stringify({
              phase: "uploading",
              current: fileIdx + 1,
              total: files.length,
              message: `Uploading "${file.originalname}"...`,
            })}\n\n`
          );

          const fileHash = computeFileHash(file.buffer);
          let document = await storage.getDocumentByHash(fileHash, orgId);
          let isDuplicate = false;

          if (document) {
            isDuplicate = true;
            res.write(
              `event: progress\ndata: ${JSON.stringify({
                phase: "uploading",
                current: fileIdx + 1,
                total: files.length,
                message: `"${file.originalname}" already exists — linking existing document.`,
              })}\n\n`
            );
          } else {
            const storageKey = generateStorageKey(file.originalname);
            const uploadResult = await uploadFile(file.buffer, storageKey, file.mimetype);

            try {
              document = await storage.createDocument({
                title: file.originalname.replace(/\.[^.]+$/, ""),
                originalFilename: file.originalname,
                s3Key: uploadResult.key,
                s3Bucket: uploadResult.bucket,
                mimeType: file.mimetype,
                fileSize: file.size,
                fileHash,
                evidenceType: req.body.evidenceType || null,
                description: null,
                documentDate: null,
                uploadedByUserId: user.id,
                extractionStatus: "pending",
                organisationId: orgId,
              });
            } catch (dbError) {
              await deleteFile(storageKey).catch(() => {});
              throw dbError;
            }
          }

          const existingLink = await storage.getDocumentControlLink(document.id, orgControl.id);
          if (!existingLink) {
            await storage.createDocumentControlLink({
              documentId: document.id,
              organisationControlId: orgControl.id,
              linkedByUserId: user.id,
              analysisStatus: "pending",
              organisationId: orgId,
            });
          }

          if (document.extractionStatus === "pending" || document.extractionStatus === "error") {
            res.write(
              `event: progress\ndata: ${JSON.stringify({
                phase: "extracting",
                current: fileIdx + 1,
                total: files.length,
                message: `Extracting text from "${file.originalname}"...`,
              })}\n\n`
            );

            try {
              await storage.updateDocument(document.id, { extractionStatus: "extracting" });
              const buffer = file.buffer;
              const { text, pageCount } = await extractText(buffer, file.mimetype);
              const sanitisedText = sanitiseTextForAI(text, file.originalname);

              const textChunks = chunkText(sanitisedText);
              await storage.createDocumentChunks(
                document.id,
                textChunks.map((c) => ({
                  chunkIndex: c.chunkIndex,
                  content: c.content,
                  tokenCount: c.tokenCount,
                  charStart: c.charStart,
                  charEnd: c.charEnd,
                  sectionHeading: c.sectionHeading,
                }))
              );

              await storage.updateDocument(document.id, {
                extractedText: sanitisedText,
                extractionStatus: "extracted",
                pageCount: pageCount || null,
              });

              document = (await storage.getDocument(document.id))!;
            } catch (extractError) {
              console.error(`[Routes] Extraction failed for "${file.originalname}":`, extractError);
              await storage.updateDocument(document.id, {
                extractionStatus: "error",
                extractionError: (extractError as Error).message,
              });
              res.write(
                `event: progress\ndata: ${JSON.stringify({
                  phase: "extracting",
                  current: fileIdx + 1,
                  total: files.length,
                  message: `Text extraction failed for "${file.originalname}" — skipping analysis.`,
                })}\n\n`
              );
              continue;
            }
          }

          const dbChunks = await storage.getDocumentChunks(document.id);
          if (dbChunks.length === 0) {
            res.write(
              `event: progress\ndata: ${JSON.stringify({
                phase: "analysing",
                current: fileIdx + 1,
                total: files.length,
                message: `No extractable text in "${file.originalname}" — skipping analysis.`,
              })}\n\n`
            );
            continue;
          }

          const link = await storage.getDocumentControlLink(document.id, orgControl.id);
          if (link) {
            await storage.updateDocumentControlLink(link.id, { analysisStatus: "analysing" });
          }

          await storage.softDeleteMatchesByDocumentAndControl(document.id, orgControl.id);

          const orgProfile = await storage.getOrganisationProfile(orgId);
          const organisationContext = buildOrganisationContextSection(
            orgProfile
              ? {
                  companyName: orgProfile.companyName,
                  industry: orgProfile.industry,
                  companySize: orgProfile.companySize,
                  techStack: orgProfile.techStack,
                  deploymentModel: orgProfile.deploymentModel,
                  regulatoryRequirements: orgProfile.regulatoryRequirements,
                  riskAppetite: orgProfile.riskAppetite,
                  additionalContext: orgProfile.additionalContext,
                }
              : null
          );

          const chunkInputs: DocumentChunkInput[] = dbChunks.map((c) => ({
            chunkIndex: c.chunkIndex,
            content: c.content,
            sectionHeading: c.sectionHeading,
            chunkId: c.id,
          }));

          const { matches, totalTokensUsed, summary } = await analyseDocumentForControl(
            document.title,
            document.evidenceType,
            chunkInputs,
            questionnaire.questions as OntologyQuestion[],
            organisationContext,
            (progress) => {
              res.write(`event: progress\ndata: ${JSON.stringify(progress)}\n\n`);
            },
            (match) => {
              res.write(`event: match\ndata: ${JSON.stringify(match)}\n\n`);
            }
          );

          for (const match of matches) {
            await storage.createDocumentQuestionMatch({
              documentId: document.id,
              organisationControlId: orgControl.id,
              organisationId: orgId,
              questionId: match.questionId,
              contentRelevance: match.contentRelevance,
              evidenceTypeMatch: match.evidenceTypeMatch,
              specificity: match.specificity,
              compositeScore: match.compositeScore,
              matchedPassage: match.matchedPassage,
              aiSummary: match.aiSummary,
              suggestedResponse: match.suggestedResponse,
              chunkId: match.chunkId || null,
              isActive: true,
              isCrossControl: false,
            });
          }

          if (link) {
            await storage.updateDocumentControlLink(link.id, {
              analysisStatus: "analysed",
              analysisCompletedAt: new Date(),
            });
          }

          await storage.createAiInteraction({
            userId: user.id,
            organisationId: orgId,
            interactionType: "document_analysis",
            controlId: control.id,
            inputSummary: `Analysed "${document.title}" for ${control.controlNumber}`,
            outputSummary: `${summary.strongMatches} strong, ${summary.partialMatches} partial, ${summary.weakMatches} weak matches. ${summary.evidenceGaps} gaps. ${summary.pendingSuggestions} suggestions.`,
            modelUsed: DEFAULT_MODEL,
            tokensUsed: totalTokensUsed,
          });

          res.write(
            `event: document-complete\ndata: ${JSON.stringify({
              documentId: document.id,
              documentTitle: document.title,
              ...summary,
            })}\n\n`
          );
        }

        res.write(`event: complete\ndata: ${JSON.stringify({ success: true })}\n\n`);
        res.end();
      } catch (error) {
        console.error("Error in document upload+analyse:", error);
        if (res.headersSent) {
          res.write(
            `event: error\ndata: ${JSON.stringify({ error: "Document analysis failed" })}\n\n`
          );
          res.end();
        } else {
          res.status(500).json({ error: "Failed to process documents" });
        }
      }
    }
  );

  app.post("/api/organisation-controls/:controlId/documents/link", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const controlId = parseInt(req.params.controlId);
      if (isNaN(controlId)) {
        return res.status(400).json({ error: "Invalid control ID" });
      }

      const { documentIds } = req.body;
      if (!Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({ error: "documentIds array is required" });
      }

      const user = req.appUser as User;
      const orgId = user.organisationId!;

      let orgControl = await storage.getOrganisationControl(controlId, orgId);
      if (!orgControl) {
        orgControl = await storage.createOrganisationControl({
          controlId,
          organisationId: orgId,
          isApplicable: true,
        });
      }

      const linked: any[] = [];

      for (const docId of documentIds) {
        const document = await storage.getDocument(docId);
        if (!document) continue;

        const existing = await storage.getDocumentControlLink(document.id, orgControl.id);
        if (existing) {
          linked.push({ documentId: document.id, alreadyLinked: true });
          continue;
        }

        await storage.createDocumentControlLink({
          documentId: document.id,
          organisationControlId: orgControl.id,
          linkedByUserId: user.id,
          analysisStatus: "pending",
          organisationId: orgId,
        });
        linked.push({ documentId: document.id, alreadyLinked: false });
      }

      res.status(201).json({ linked });
    } catch (error) {
      console.error("Error linking documents:", error);
      res.status(500).json({ error: "Failed to link documents" });
    }
  });

  app.get("/api/organisation-controls/:controlId/documents", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const controlId = parseInt(req.params.controlId);
      if (isNaN(controlId)) {
        return res.status(400).json({ error: "Invalid control ID" });
      }

      const user = req.appUser as User;
      const orgId = user.organisationId!;

      const orgControl = await storage.getOrganisationControl(controlId, orgId);
      if (!orgControl) {
        return res.json([]);
      }

      const docs = await storage.getDocumentsByOrgControl(orgControl.id);

      const enriched = await Promise.all(
        docs.map(async (doc) => {
          const link = await storage.getDocumentControlLink(doc.id, orgControl.id);
          return { document: doc, link: link || null };
        })
      );

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching control documents:", error);
      res.status(500).json({ error: "Failed to fetch control documents" });
    }
  });

  app.delete("/api/organisation-controls/:controlId/documents/:documentId", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const controlId = parseInt(req.params.controlId);
      const documentId = parseInt(req.params.documentId);
      if (isNaN(controlId) || isNaN(documentId)) {
        return res.status(400).json({ error: "Invalid control or document ID" });
      }

      const user = req.appUser as User;
      const orgId = user.organisationId!;

      const orgControl = await storage.getOrganisationControl(controlId, orgId);
      if (!orgControl) {
        return res.status(404).json({ error: "Organisation control not found" });
      }

      await storage.softDeleteMatchesByDocumentAndControl(documentId, orgControl.id);
      const deleted = await storage.deleteDocumentControlLink(documentId, orgControl.id);
      if (!deleted) {
        return res.status(404).json({ error: "Document-control link not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error unlinking document:", error);
      res.status(500).json({ error: "Failed to unlink document" });
    }
  });

  app.post(
    "/api/organisation-controls/:controlId/documents/:documentId/analyse",
    isAuthenticated, requireOrg,
    async (req: any, res) => {
      const controlId = parseInt(req.params.controlId);
      const documentId = parseInt(req.params.documentId);
      if (isNaN(controlId) || isNaN(documentId)) {
        return res.status(400).json({ error: "Invalid control or document ID" });
      }

      const user = req.appUser as User;
      const orgId = user.organisationId!;

      const orgControl = await storage.getOrganisationControl(controlId, orgId);
      if (!orgControl) {
        return res.status(404).json({ error: "Organisation control not found" });
      }

      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (document.extractionStatus !== "extracted") {
        return res.status(400).json({ error: "Document text has not been extracted yet" });
      }

      const control = await storage.getControlById(controlId);
      if (!control) {
        return res.status(404).json({ error: "Control not found" });
      }

      const questionnaire = control.aiQuestionnaire as ControlQuestionnaire | null;
      if (!questionnaire || !questionnaire.questions || questionnaire.questions.length === 0) {
        return res.status(400).json({ error: "No questionnaire generated for this control" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      try {
        const link = await storage.getDocumentControlLink(document.id, orgControl.id);
        if (link) {
          await storage.updateDocumentControlLink(link.id, { analysisStatus: "analysing" });
        }

        await storage.softDeleteMatchesByDocumentAndControl(document.id, orgControl.id);

        const dbChunks = await storage.getDocumentChunks(document.id);
        const chunkInputs: DocumentChunkInput[] = dbChunks.map((c) => ({
          chunkIndex: c.chunkIndex,
          content: c.content,
          sectionHeading: c.sectionHeading,
          chunkId: c.id,
        }));

        const orgProfile = await storage.getOrganisationProfile(orgId);
        const organisationContext = buildOrganisationContextSection(
          orgProfile
            ? {
                companyName: orgProfile.companyName,
                industry: orgProfile.industry,
                companySize: orgProfile.companySize,
                techStack: orgProfile.techStack,
                deploymentModel: orgProfile.deploymentModel,
                regulatoryRequirements: orgProfile.regulatoryRequirements,
                riskAppetite: orgProfile.riskAppetite,
                additionalContext: orgProfile.additionalContext,
              }
            : null
        );

        const { matches, totalTokensUsed, summary } = await analyseDocumentForControl(
          document.title,
          document.evidenceType,
          chunkInputs,
          questionnaire.questions as OntologyQuestion[],
          organisationContext,
          (progress) => {
            res.write(`event: progress\ndata: ${JSON.stringify(progress)}\n\n`);
          },
          (match) => {
            res.write(`event: match\ndata: ${JSON.stringify(match)}\n\n`);
          }
        );

        for (const match of matches) {
          await storage.createDocumentQuestionMatch({
            documentId: document.id,
            organisationControlId: orgControl.id,
            organisationId: orgId,
            questionId: match.questionId,
            contentRelevance: match.contentRelevance,
            evidenceTypeMatch: match.evidenceTypeMatch,
            specificity: match.specificity,
            compositeScore: match.compositeScore,
            matchedPassage: match.matchedPassage,
            aiSummary: match.aiSummary,
            suggestedResponse: match.suggestedResponse,
            chunkId: match.chunkId || null,
            isActive: true,
            isCrossControl: false,
          });
        }

        if (link) {
          await storage.updateDocumentControlLink(link.id, {
            analysisStatus: "analysed",
            analysisCompletedAt: new Date(),
          });
        }

        await storage.createAiInteraction({
          userId: user.id,
          organisationId: orgId,
          interactionType: "document_analysis",
          controlId: control.id,
          inputSummary: `Re-analysed "${document.title}" for ${control.controlNumber}`,
          outputSummary: `${summary.strongMatches} strong, ${summary.partialMatches} partial, ${summary.weakMatches} weak. ${summary.pendingSuggestions} suggestions.`,
          modelUsed: DEFAULT_MODEL,
          tokensUsed: totalTokensUsed,
        });

        res.write(`event: complete\ndata: ${JSON.stringify(summary)}\n\n`);
        res.end();
      } catch (error) {
        console.error("Error re-analysing document:", error);
        if (res.headersSent) {
          res.write(
            `event: error\ndata: ${JSON.stringify({ error: "Re-analysis failed" })}\n\n`
          );
          res.end();
        } else {
          res.status(500).json({ error: "Failed to re-analyse document" });
        }
      }
    }
  );

  app.get("/api/organisation-controls/:controlId/question-matches", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const controlId = parseInt(req.params.controlId);
      if (isNaN(controlId)) {
        return res.status(400).json({ error: "Invalid control ID" });
      }

      const user = req.appUser as User;
      const orgId = user.organisationId!;

      const orgControl = await storage.getOrganisationControl(controlId, orgId);
      if (!orgControl) {
        return res.json([]);
      }

      const matches = await storage.getActiveMatchesByOrgControl(orgControl.id);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching question matches:", error);
      res.status(500).json({ error: "Failed to fetch question matches" });
    }
  });

  app.get("/api/organisation-controls/:controlId/evidence-gaps", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const controlId = parseInt(req.params.controlId);
      if (isNaN(controlId)) {
        return res.status(400).json({ error: "Invalid control ID" });
      }

      const user = req.appUser as User;
      const orgId = user.organisationId!;

      const control = await storage.getControlById(controlId);
      if (!control) {
        return res.status(404).json({ error: "Control not found" });
      }

      const questionnaire = control.aiQuestionnaire as ControlQuestionnaire | null;
      if (!questionnaire || !questionnaire.questions) {
        return res.json({ questions: [], totalQuestions: 0, coveredQuestions: 0, gapQuestions: 0 });
      }

      const orgControl = await storage.getOrganisationControl(controlId, orgId);
      const matches = orgControl
        ? await storage.getActiveMatchesByOrgControl(orgControl.id)
        : [];

      const matchesByQuestion = new Map<number, typeof matches>();
      for (const match of matches) {
        const existing = matchesByQuestion.get(match.questionId) || [];
        existing.push(match);
        matchesByQuestion.set(match.questionId, existing);
      }

      const questions = questionnaire.questions.map((q: OntologyQuestion) => {
        const questionMatches = matchesByQuestion.get(q.question_id) || [];
        const bestMatch = questionMatches.length > 0
          ? questionMatches.reduce((a, b) => (a.compositeScore >= b.compositeScore ? a : b))
          : null;
        const pendingSuggestions = questionMatches.filter(
          (m) => m.userAccepted === null && m.compositeScore >= 0.5
        ).length;

        let evidenceStatus: "none" | "partial" | "full" = "none";
        if (bestMatch) {
          if (bestMatch.compositeScore >= 0.85 && bestMatch.evidenceTypeMatch) {
            evidenceStatus = "full";
          } else {
            evidenceStatus = "partial";
          }
        }

        return {
          questionId: q.question_id,
          question: q.question,
          evidenceType: q.evidence_type,
          evidenceStatus,
          bestScore: bestMatch?.compositeScore || null,
          matchCount: questionMatches.length,
          pendingSuggestions,
        };
      });

      const coveredQuestions = questions.filter((q) => q.evidenceStatus !== "none").length;

      res.json({
        questions,
        totalQuestions: questions.length,
        coveredQuestions,
        gapQuestions: questions.length - coveredQuestions,
      });
    } catch (error) {
      console.error("Error fetching evidence gaps:", error);
      res.status(500).json({ error: "Failed to fetch evidence gaps" });
    }
  });

  // ─── Suggestion Review ────────────────────────────────────────────────────

  app.post("/api/question-matches/:matchId/accept", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      if (isNaN(matchId)) {
        return res.status(400).json({ error: "Invalid match ID" });
      }

      const user = req.appUser as User;
      const orgId = user.organisationId!;

      const match = await storage.getMatchById(matchId);
      if (!match || match.organisationId !== orgId) {
        return res.status(404).json({ error: "Match not found" });
      }

      const accepted = await storage.acceptSuggestion(matchId, user.id);

      const orgControl = await storage.getOrganisationControl(match.organisationControlId, orgId);
      if (orgControl) {
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
          (r) => r.question_id === match.questionId
        );
        const previousResponse = existingIndex >= 0 ? existingResponses.responses[existingIndex].response_text : null;

        const newResponse: QuestionResponse = {
          question_id: match.questionId,
          response_text: match.suggestedResponse || "",
          evidence_references: existingIndex >= 0 ? existingResponses.responses[existingIndex].evidence_references : [],
          last_updated: new Date().toISOString(),
          answered_by_user_id: user.id,
        };

        if (existingIndex >= 0) {
          existingResponses.responses[existingIndex] = newResponse;
        } else {
          existingResponses.responses.push(newResponse);
        }

        existingResponses.completion_status.answered = existingResponses.responses.filter(
          (r) => r.response_text.trim().length > 0
        ).length;

        await storage.updateOrganisationControl(match.organisationControlId, orgId, {
          implementationResponses: existingResponses,
          implementationUpdatedAt: new Date(),
        });

        await storage.createResponseChangeLog({
          organisationControlId: match.organisationControlId,
          organisationId: orgId,
          questionId: match.questionId,
          previousResponse,
          newResponse: match.suggestedResponse || "",
          changeSource: "ai_suggestion_accepted",
          sourceDocumentId: match.documentId,
          sourceMatchId: match.id,
          changedByUserId: user.id,
        });
      }

      res.json({ success: true, match: accepted });
    } catch (error) {
      console.error("Error accepting suggestion:", error);
      res.status(500).json({ error: "Failed to accept suggestion" });
    }
  });

  app.post("/api/question-matches/:matchId/dismiss", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      if (isNaN(matchId)) {
        return res.status(400).json({ error: "Invalid match ID" });
      }

      const user = req.appUser as User;
      const orgId = user.organisationId!;

      const match = await storage.getMatchById(matchId);
      if (!match || match.organisationId !== orgId) {
        return res.status(404).json({ error: "Match not found" });
      }

      const dismissed = await storage.dismissSuggestion(matchId, user.id);
      if (!dismissed) {
        return res.status(404).json({ error: "Match not found" });
      }

      res.json({ success: true, match: dismissed });
    } catch (error) {
      console.error("Error dismissing suggestion:", error);
      res.status(500).json({ error: "Failed to dismiss suggestion" });
    }
  });

  app.post("/api/question-matches/:matchId/accept-edited", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      if (isNaN(matchId)) {
        return res.status(400).json({ error: "Invalid match ID" });
      }

      const { editedResponse } = req.body;
      if (!editedResponse || typeof editedResponse !== "string") {
        return res.status(400).json({ error: "editedResponse is required" });
      }

      const user = req.appUser as User;
      const orgId = user.organisationId!;

      const match = await storage.getMatchById(matchId);
      if (!match || match.organisationId !== orgId) {
        return res.status(404).json({ error: "Match not found" });
      }

      await storage.acceptSuggestion(matchId, user.id);

      const orgControl = await storage.getOrganisationControl(match.organisationControlId, orgId);
      if (orgControl) {
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
          (r) => r.question_id === match.questionId
        );
        const previousResponse = existingIndex >= 0 ? existingResponses.responses[existingIndex].response_text : null;

        const newResponse: QuestionResponse = {
          question_id: match.questionId,
          response_text: editedResponse,
          evidence_references: existingIndex >= 0 ? existingResponses.responses[existingIndex].evidence_references : [],
          last_updated: new Date().toISOString(),
          answered_by_user_id: user.id,
        };

        if (existingIndex >= 0) {
          existingResponses.responses[existingIndex] = newResponse;
        } else {
          existingResponses.responses.push(newResponse);
        }

        existingResponses.completion_status.answered = existingResponses.responses.filter(
          (r) => r.response_text.trim().length > 0
        ).length;

        await storage.updateOrganisationControl(match.organisationControlId, orgId, {
          implementationResponses: existingResponses,
          implementationUpdatedAt: new Date(),
        });

        await storage.createResponseChangeLog({
          organisationControlId: match.organisationControlId,
          organisationId: orgId,
          questionId: match.questionId,
          previousResponse,
          newResponse: editedResponse,
          changeSource: "ai_suggestion_edited",
          sourceDocumentId: match.documentId,
          sourceMatchId: match.id,
          changedByUserId: user.id,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error accepting edited suggestion:", error);
      res.status(500).json({ error: "Failed to accept edited suggestion" });
    }
  });

  // ─── Response History ─────────────────────────────────────────────────────

  app.get(
    "/api/organisation-controls/:controlId/questions/:questionId/history",
    isAuthenticated, requireOrg,
    async (req: any, res) => {
      try {
        const controlId = parseInt(req.params.controlId);
        const questionId = parseInt(req.params.questionId);
        if (isNaN(controlId) || isNaN(questionId)) {
          return res.status(400).json({ error: "Invalid control or question ID" });
        }

        const user = req.appUser as User;
        const orgId = user.organisationId!;

        const orgControl = await storage.getOrganisationControl(controlId, orgId);
        if (!orgControl) {
          return res.json([]);
        }

        const history = await storage.getResponseHistory(orgControl.id, questionId);
        res.json(history);
      } catch (error) {
        console.error("Error fetching response history:", error);
        res.status(500).json({ error: "Failed to fetch response history" });
      }
    }
  );

  // Dashboard
  app.get("/api/dashboard", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const user = req.appUser as User;
      const stats = await storage.getDashboardStats(user.organisationId!);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  app.get("/api/dashboard/stats", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const user = req.appUser as User;
      const stats = await storage.getDashboardStats(user.organisationId!);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Categories
  app.get("/api/categories", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Controls
  app.get("/api/controls", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const user = req.appUser as User;
      const controls = await storage.getControlsWithLatestTest(user.organisationId!);
      res.json(controls);
    } catch (error) {
      console.error("Error fetching controls:", error);
      res.status(500).json({ error: "Failed to fetch controls" });
    }
  });

  app.get("/api/controls/stats", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const user = req.appUser as User;
      const stats = await storage.getControlsStats(user.organisationId!);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching controls stats:", error);
      res.status(500).json({ error: "Failed to fetch controls stats" });
    }
  });

  app.get("/api/controls/applicability", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const user = req.appUser as User;
      const applicability = await storage.getControlsApplicability(user.organisationId!);
      res.json(applicability);
    } catch (error) {
      console.error("Error fetching control applicability:", error);
      res.status(500).json({ error: "Failed to fetch control applicability" });
    }
  });

  app.patch("/api/controls/applicability", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const user = req.appUser as User;
      const { updates } = req.body;

      if (!Array.isArray(updates)) {
        return res.status(400).json({ error: "Updates must be an array" });
      }

      const updatedCount = await storage.updateControlsApplicability(user.organisationId!, updates);
      res.json({ updated: updatedCount });
    } catch (error) {
      console.error("Error updating control applicability:", error);
      res.status(500).json({ error: "Failed to update control applicability" });
    }
  });

  app.get("/api/controls/:controlNumber", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const user = req.appUser as User;
      const control = await storage.getControlByNumber(req.params.controlNumber, user.organisationId!);
      if (!control) {
        return res.status(404).json({ error: "Control not found" });
      }
      res.json(control);
    } catch (error) {
      console.error("Error fetching control:", error);
      res.status(500).json({ error: "Failed to fetch control" });
    }
  });

  app.post("/api/controls/:controlNumber/generate-questionnaire", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const user = req.appUser as User;
      const orgId = user.organisationId!;

      const control = await storage.getControlByNumber(req.params.controlNumber, orgId);
      if (!control) {
        return res.status(404).json({ error: "Control not found" });
      }

      const { questionnaire, tokensUsed } = await generateQuestionnaire(
        control.controlNumber,
        control.name,
        control.description || ""
      );

      await storage.updateControlQuestionnaire(control.id, questionnaire, new Date());

      await storage.createAiInteraction({
        userId: user.id,
        organisationId: orgId,
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

  // Organisation Controls
  app.patch("/api/organisation-controls/:controlId", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const controlId = parseInt(req.params.controlId);
      if (isNaN(controlId)) {
        return res.status(400).json({ error: "Invalid control ID" });
      }

      const user = req.appUser as User;
      const orgId = user.organisationId!;

      const { isApplicable, frequency, exclusionJustification, startQuarter } = req.body;

      const calculateNextDueDate = (freq: string, quarter: string): string | null => {
        if (!freq) return null;

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const quarterMonths: Record<string, number> = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 };
        const startMonth = quarterMonths[quarter] ?? 0;

        let nextDueDate: Date = new Date();

        switch (freq) {
          case "Annual":
            nextDueDate = new Date(currentYear, startMonth, 1);
            if (nextDueDate <= now) {
              nextDueDate = new Date(currentYear + 1, startMonth, 1);
            }
            break;
          case "Quarterly":
            const quarterMonthsList = [0, 3, 6, 9];
            const startQuarterIndex = quarterMonthsList.indexOf(startMonth);
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
              nextDueDate = new Date(currentYear + 1, startMonth, 1);
            }
            break;
          case "Monthly":
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

      let orgControl = await storage.getOrganisationControl(controlId, orgId);
      if (!orgControl) {
        orgControl = await storage.createOrganisationControl({
          controlId,
          organisationId: orgId,
          isApplicable: isApplicable ?? true,
          frequency: effectiveFrequency,
          startQuarter: startQuarter || null,
          exclusionJustification: exclusionJustification || null,
          nextDueDate,
        });
      } else {
        orgControl = await storage.updateOrganisationControl(controlId, orgId, {
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
  app.get("/api/test-runs", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const user = req.appUser as User;
      const testRuns = await storage.getTestRuns(user.organisationId!);
      res.json(testRuns);
    } catch (error) {
      console.error("Error fetching test runs:", error);
      res.status(500).json({ error: "Failed to fetch test runs" });
    }
  });

  app.post("/api/test-runs", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const user = req.appUser as User;
      const orgId = user.organisationId!;

      const { organisationControlId, status, comments, aiAnalysis, aiSuggestedStatus, aiConfidence, aiContextScope, evidenceLinks: evidenceLinksData } = req.body;

      if (!organisationControlId) {
        return res.status(400).json({ error: "Organisation control ID is required" });
      }

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const orgControlCheck = await db.select().from(organisationControlsTable).where(
        drizzleAnd(
          drizzleEq(organisationControlsTable.id, organisationControlId),
          drizzleEq(organisationControlsTable.organisationId, orgId)
        )
      );
      if (orgControlCheck.length === 0) {
        return res.status(404).json({ error: "Organisation control not found" });
      }

      const testRun = await storage.createTestRun({
        organisationControlId,
        organisationId: orgId,
        testerUserId: user.id,
        status,
        comments: comments || null,
        aiAnalysis: aiAnalysis || null,
        aiSuggestedStatus: aiSuggestedStatus || null,
        aiConfidence: aiConfidence || null,
        aiContextScope: aiContextScope || null,
      });

      if (Array.isArray(evidenceLinksData) && evidenceLinksData.length > 0) {
        for (const ev of evidenceLinksData) {
          await storage.createEvidenceLink({
            testRunId: testRun.id,
            organisationControlId,
            organisationId: orgId,
            title: ev.title,
            url: ev.url || null,
            evidenceType: ev.evidenceType || null,
            description: ev.description || null,
            addedByUserId: user.id,
          });
        }
      }

      res.status(201).json(testRun);
    } catch (error) {
      console.error("Error creating test run:", error);
      res.status(500).json({ error: "Failed to create test run" });
    }
  });

  // AI Interactions
  app.get("/api/ai-interactions", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const user = req.appUser as User;
      const interactions = await storage.getAiInteractions(user.organisationId!);
      res.json(interactions);
    } catch (error) {
      console.error("Error fetching AI interactions:", error);
      res.status(500).json({ error: "Failed to fetch AI interactions" });
    }
  });

  // Persona
  app.patch("/api/organisation-controls/:controlId/persona", isAuthenticated, requireOrg, async (req: any, res) => {
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
      const user = req.appUser as User;
      const orgId = user.organisationId!;

      let orgControl = await storage.getOrganisationControl(controlId, orgId);
      if (!orgControl) {
        orgControl = await storage.createOrganisationControl({
          controlId,
          organisationId: orgId,
          isApplicable: true,
          selectedPersona: persona,
        });
      } else {
        orgControl = await storage.updateOrganisationControl(controlId, orgId, {
          selectedPersona: persona,
        });
      }

      const control = await storage.getControlById(controlId);
      if (control) {
        await storage.createAiInteraction({
          userId: user.id,
          organisationId: orgId,
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

  // Save response
  app.patch("/api/organisation-controls/:controlId/response", isAuthenticated, requireOrg, async (req: any, res) => {
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
      const user = req.appUser as User;
      const orgId = user.organisationId!;

      let orgControl = await storage.getOrganisationControl(controlId, orgId);
      if (!orgControl) {
        orgControl = await storage.createOrganisationControl({
          controlId,
          organisationId: orgId,
          isApplicable: true,
        });
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

      existingResponses.completion_status.answered = existingResponses.responses.filter(
        (r) => r.response_text.trim().length > 0
      ).length;

      await storage.updateOrganisationControl(controlId, orgId, {
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
  app.patch("/api/organisation-controls/:controlId/response/:questionId/evidence", isAuthenticated, requireOrg, async (req: any, res) => {
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

      const user = req.appUser as User;
      const orgId = user.organisationId!;
      const orgControl = await storage.getOrganisationControl(controlId, orgId);

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

      await storage.updateOrganisationControl(controlId, orgId, {
        implementationResponses: existingResponses,
        implementationUpdatedAt: new Date(),
      });

      res.json({ success: true, evidence_references: existingResponses.responses.find(r => r.question_id === questionId)?.evidence_references || [] });
    } catch (error) {
      console.error("Error adding evidence:", error);
      res.status(500).json({ error: "Failed to add evidence" });
    }
  });

  // Evidence Links
  app.get("/api/organisation-controls/:controlId/evidence-links", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const controlId = parseInt(req.params.controlId);
      if (isNaN(controlId)) {
        return res.status(400).json({ error: "Invalid control ID" });
      }

      const user = req.appUser as User;
      const orgId = user.organisationId!;

      const orgControl = await storage.getOrganisationControl(controlId, orgId);
      if (!orgControl) {
        return res.status(404).json({ error: "Organisation control not found" });
      }

      const questionId = req.query.questionId ? parseInt(req.query.questionId as string) : undefined;
      const links = await storage.getEvidenceLinksByOrgControl(orgControl.id, questionId);
      res.json(links);
    } catch (error) {
      console.error("Error fetching evidence links:", error);
      res.status(500).json({ error: "Failed to fetch evidence links" });
    }
  });

  app.post("/api/organisation-controls/:controlId/evidence-links", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const controlId = parseInt(req.params.controlId);
      if (isNaN(controlId)) {
        return res.status(400).json({ error: "Invalid control ID" });
      }

      const user = req.appUser as User;
      const orgId = user.organisationId!;

      let orgControl = await storage.getOrganisationControl(controlId, orgId);
      if (!orgControl) {
        orgControl = await storage.createOrganisationControl({
          controlId,
          organisationId: orgId,
          isApplicable: true,
        });
      }

      const { title, url, evidenceType, description, questionId } = req.body;
      if (!title || typeof title !== "string") {
        return res.status(400).json({ error: "Title is required" });
      }

      const link = await storage.createEvidenceLink({
        organisationControlId: orgControl.id,
        organisationId: orgId,
        questionId: questionId ?? null,
        testRunId: null,
        title,
        url: url || null,
        evidenceType: evidenceType || null,
        description: description || null,
        addedByUserId: user.id,
      });

      res.status(201).json(link);
    } catch (error) {
      console.error("Error creating evidence link:", error);
      res.status(500).json({ error: "Failed to create evidence link" });
    }
  });

  app.delete("/api/evidence-links/:id", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid evidence link ID" });
      }

      const user = req.appUser as User;
      const [link] = await db.select().from(evidenceLinksTable).where(drizzleEq(evidenceLinksTable.id, id));
      if (!link || link.organisationId !== user.organisationId) {
        return res.status(404).json({ error: "Evidence link not found" });
      }

      const deleted = await storage.deleteEvidenceLink(id);
      if (!deleted) {
        return res.status(404).json({ error: "Evidence link not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting evidence link:", error);
      res.status(500).json({ error: "Failed to delete evidence link" });
    }
  });

  // AI analysis with streaming
  const analyzeRequestSchema = z.object({
    persona: personaSchema,
    include_history: z.boolean().default(true),
    comments: z.string().default(""),
  });

  app.post("/api/controls/:controlNumber/analyze", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const parseResult = analyzeRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request body", details: parseResult.error.errors });
      }

      const { persona, include_history, comments } = parseResult.data;
      const user = req.appUser as User;
      const orgId = user.organisationId!;

      const control = await storage.getControlByNumber(req.params.controlNumber, orgId);
      if (!control) {
        return res.status(404).json({ error: "Control not found" });
      }

      const questionnaire = control.aiQuestionnaire;
      if (!questionnaire || !questionnaire.questions || questionnaire.questions.length === 0) {
        return res.status(400).json({ error: "No questionnaire available for this control" });
      }

      const orgControl = control.organisationControl;
      if (!orgControl) {
        return res.status(400).json({ error: "Organisation control not configured" });
      }

      const implementationResponses = orgControl.implementationResponses as ImplementationResponses | null;
      const responses: AIQuestionResponse[] = (implementationResponses?.responses || []).map(r => ({
        question_id: r.question_id,
        response_text: r.response_text,
        evidence_references: r.evidence_references,
      }));

      const hasResponses = responses.some(r => r.response_text?.trim());
      if (!hasResponses && !comments.trim()) {
        return res.status(400).json({ error: "No responses or comments provided for analysis" });
      }

      let previousTests: TestRunHistory[] = [];
      if (include_history && control.recentTestRuns) {
        previousTests = control.recentTestRuns.slice(0, 3).map(t => ({
          testDate: new Date(t.testDate).toLocaleDateString(),
          status: t.status,
          comments: t.comments,
        }));
      }

      const orgProfile = await storage.getOrganisationProfile(orgId);
      const organisationContext = orgProfile ? {
        companyName: orgProfile.companyName,
        industry: orgProfile.industry,
        companySize: orgProfile.companySize,
        techStack: orgProfile.techStack,
        deploymentModel: orgProfile.deploymentModel,
        regulatoryRequirements: orgProfile.regulatoryRequirements,
        riskAppetite: orgProfile.riskAppetite,
        additionalContext: orgProfile.additionalContext,
      } : null;

      const aiQuestions: AIQuestion[] = questionnaire.questions.map(q => ({
        question_id: q.question_id,
        question: q.question,
        guidance: q.guidance || "",
        auditor_focus: q.auditor_focus || "",
        evidence_type: q.evidence_type || "",
        what_good_looks_like: q.what_good_looks_like || "",
        red_flags: q.red_flags || "",
        nc_pattern: q.nc_pattern || "",
        related_controls: q.related_controls || "",
      }));

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      const { analysis, tokensUsed, fullText } = await streamAnalysis(
        persona,
        control.controlNumber,
        control.name,
        aiQuestions,
        responses,
        comments,
        previousTests,
        organisationContext,
        (text) => {
          res.write(`event: token\ndata: ${JSON.stringify({ text })}\n\n`);
        }
      );

      await storage.createAiInteraction({
        userId: user.id,
        organisationId: orgId,
        interactionType: "test_analysis",
        controlId: control.id,
        inputSummary: `${persona} analysis for ${control.controlNumber}`,
        outputSummary: `Status: ${analysis.suggested_status}, Confidence: ${Math.round(analysis.confidence * 100)}%`,
        modelUsed: DEFAULT_MODEL,
        tokensUsed,
      });

      res.write(`event: complete\ndata: ${JSON.stringify(analysis)}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error analyzing control:", error);

      if (error instanceof AIConfigurationError) {
        res.status(502).json({ error: error.message });
        return;
      }

      if (res.headersSent) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: "Analysis failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to analyze control" });
      }
    }
  });

  // Settings
  app.get("/api/settings", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const user = req.appUser as User;
      const aiConfig = checkAIConfiguration();
      const categories = await storage.getCategories();
      const stats = await storage.getDashboardStats(user.organisationId!);

      res.json({
        ai: {
          configured: aiConfig.configured,
          message: aiConfig.message,
          model: DEFAULT_MODEL,
        },
        defaults: {
          frequency: "Annual",
          startQuarter: "Q1",
        },
        statistics: {
          totalControls: stats.totalControls,
          totalCategories: categories.length,
          testedControls: stats.testedControls,
          passedControls: stats.passedControls,
          failedControls: stats.failedControls,
        },
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings/test-api", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const aiConfig = checkAIConfiguration();
      if (!aiConfig.configured) {
        res.json({
          success: false,
          message: aiConfig.message,
        });
        return;
      }

      const anthropic = new Anthropic();
      await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 10,
        messages: [{ role: "user", content: "Hello" }],
      });

      res.json({
        success: true,
        message: "API connection successful",
        model: DEFAULT_MODEL,
      });
    } catch (error: any) {
      console.error("API test failed:", error);
      res.json({
        success: false,
        message: error.message || "API connection failed",
      });
    }
  });

  app.get("/api/export/test-history", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const user = req.appUser as User;
      const testRuns = await storage.getTestRuns(user.organisationId!);

      const csvHeader = "Test Date,Control Number,Control Name,Status,Tester,Comments,AI Suggested Status,AI Confidence\n";

      const escapeCSV = (value: string): string => {
        if (value.includes('"') || value.includes(',') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvRows = testRuns.map(run => {
        const testDate = new Date(run.testDate).toISOString();
        const controlNumber = run.organisationControl?.control?.controlNumber || "";
        const controlName = run.organisationControl?.control?.name || "";
        const status = run.status;
        const tester = getUserDisplayName(run.tester);
        const comments = run.comments || "";
        const aiSuggestedStatus = run.aiSuggestedStatus || "";
        const aiConfidence = run.aiConfidence ? `${(run.aiConfidence * 100).toFixed(0)}%` : "";

        return [
          testDate,
          controlNumber,
          escapeCSV(controlName),
          status,
          escapeCSV(tester),
          escapeCSV(comments),
          aiSuggestedStatus,
          aiConfidence
        ].join(',');
      }).join("\n");

      const csv = csvHeader + csvRows;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=test-history.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error exporting test history:", error);
      res.status(500).json({ error: "Failed to export test history" });
    }
  });

  // Organisation Profile
  app.get("/api/settings/profile", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const user = req.appUser as User;
      const profile = await storage.getOrganisationProfile(user.organisationId!);
      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching organisation profile:", error);
      res.status(500).json({ error: "Failed to fetch organisation profile" });
    }
  });

  app.put("/api/settings/profile", isAuthenticated, requireOrg, async (req: any, res) => {
    try {
      const user = req.appUser as User;
      const orgId = user.organisationId!;

      const {
        companyName,
        industry,
        companySize,
        techStack,
        deploymentModel,
        regulatoryRequirements,
        dataClassificationLevels,
        riskAppetite,
        additionalContext,
        hideNonApplicableControls,
      } = req.body;

      const profile = await storage.upsertOrganisationProfile(orgId, {
        companyName: companyName || null,
        industry: industry || null,
        companySize: companySize || null,
        techStack: techStack || null,
        deploymentModel: deploymentModel || null,
        regulatoryRequirements: regulatoryRequirements || [],
        dataClassificationLevels: dataClassificationLevels || [],
        riskAppetite: riskAppetite || "Moderate",
        additionalContext: additionalContext || null,
        hideNonApplicableControls: hideNonApplicableControls ?? false,
      });

      res.json(profile);
    } catch (error) {
      console.error("Error updating organisation profile:", error);
      res.status(500).json({ error: "Failed to update organisation profile" });
    }
  });

  return httpServer;
}
