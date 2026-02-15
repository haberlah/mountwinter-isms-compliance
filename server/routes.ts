import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { generateQuestionnaire, analyzeTestResponse, DEFAULT_MODEL, AIConfigurationError, checkAIConfiguration, streamAnalysis, buildOrganisationContextSection, type OntologyQuestion as AIQuestion, type QuestionResponse as AIQuestionResponse, type TestRunHistory } from "./ai";
import { insertTestRunSchema, type Persona, type ImplementationResponses, type QuestionResponse, type ControlQuestionnaire, type OntologyQuestion } from "@shared/schema";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { upload } from "./upload";
import { isStorageConfigured, generateStorageKey, uploadFile, downloadFile, deleteFile, checkStorageConnection, getBackendName } from "./storage-backend";
import { computeFileHash, extractText, sanitiseTextForAI, chunkText } from "./document-processor";
import { analyseDocumentForControl, type DocumentChunkInput } from "./document-analyser";

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

  // Check document storage configuration on startup
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

  // Upload documents to central repository
  app.post("/api/documents/upload", upload.array("files", 10), async (req, res) => {
    try {
      if (!isStorageConfigured()) {
        return res.status(503).json({ error: "Document storage is not configured" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      const user = await storage.getOrCreateDefaultUser();
      const results: any[] = [];

      for (const file of files) {
        // Compute hash for deduplication
        const fileHash = computeFileHash(file.buffer);
        const existing = await storage.getDocumentByHash(fileHash);

        if (existing) {
          results.push({ document: existing, isDuplicate: true });
          continue;
        }

        // Upload to storage backend first
        const storageKey = generateStorageKey(file.originalname);
        const uploadResult = await uploadFile(file.buffer, storageKey, file.mimetype);

        try {
          // Create DB record
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
          });

          // Extract text asynchronously (non-blocking for the response)
          try {
            await storage.updateDocument(document.id, { extractionStatus: "extracting" });
            const { text, pageCount } = await extractText(file.buffer, file.mimetype);
            const sanitisedText = sanitiseTextForAI(text, file.originalname);

            // Chunk the text
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
          // Clean up storage object if DB insert fails
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

  // List all documents with search, filtering, and pagination
  app.get("/api/documents", async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const type = req.query.type as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);

      const { documents, total } = await storage.getAllDocuments({ search, type, page, limit });
      res.json({ documents, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Document repository statistics
  app.get("/api/documents/stats", async (req, res) => {
    try {
      const stats = await storage.getDocumentStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching document stats:", error);
      res.status(500).json({ error: "Failed to fetch document statistics" });
    }
  });

  // Get single document details
  app.get("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }

      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Add staleness warning if documentDate > 12 months old
      const staleWarning =
        document.documentDate &&
        Date.now() - new Date(document.documentDate).getTime() > 365 * 24 * 60 * 60 * 1000;

      res.json({ ...document, staleWarning: !!staleWarning });
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  // Download document (stream from storage backend)
  app.get("/api/documents/:id/download", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }

      const document = await storage.getDocument(id);
      if (!document) {
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

  // Update document metadata
  app.patch("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }

      const document = await storage.getDocument(id);
      if (!document) {
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

  // Delete document (fails if linked to controls due to RESTRICT)
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }

      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      try {
        const deleted = await storage.deleteDocument(id);
        if (deleted) {
          // Clean up storage object
          await deleteFile(document.s3Key).catch((e) =>
            console.warn(`[Routes] Failed to delete storage object "${document.s3Key}":`, e)
          );
        }
        res.json({ success: true });
      } catch (deleteError: any) {
        // RESTRICT constraint — document is linked to controls
        if (deleteError.code === "23503") {
          return res.status(409).json({
            error: "Cannot delete document while it is linked to controls. Unlink it first.",
          });
        }
        throw deleteError;
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // ─── Document-Control Linking & Analysis ──────────────────────────────────

  // Upload documents directly to a control (upload + link + auto-analyse via SSE)
  app.post(
    "/api/organisation-controls/:controlId/documents/upload",
    upload.array("files", 10),
    async (req, res) => {
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

      // Ensure the organisation control exists
      let orgControl = await storage.getOrganisationControl(controlId);
      if (!orgControl) {
        orgControl = await storage.createOrganisationControl({
          controlId,
          isApplicable: true,
        });
      }

      // Get the control for questionnaire data
      const control = await storage.getControlById(controlId);
      if (!control) {
        return res.status(404).json({ error: "Control not found" });
      }

      const questionnaire = control.aiQuestionnaire as ControlQuestionnaire | null;
      if (!questionnaire || !questionnaire.questions || questionnaire.questions.length === 0) {
        return res.status(400).json({ error: "No questionnaire generated for this control. Generate one first." });
      }

      // Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      const user = await storage.getOrCreateDefaultUser();

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

          // Compute hash for deduplication
          const fileHash = computeFileHash(file.buffer);
          let document = await storage.getDocumentByHash(fileHash);
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
            // Upload to storage backend
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
              });
            } catch (dbError) {
              await deleteFile(storageKey).catch(() => {});
              throw dbError;
            }
          }

          // Link document to control
          const existingLink = await storage.getDocumentControlLink(document.id, orgControl.id);
          if (!existingLink) {
            await storage.createDocumentControlLink({
              documentId: document.id,
              organisationControlId: orgControl.id,
              linkedByUserId: user.id,
              analysisStatus: "pending",
            });
          }

          // Extract text if not already done
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
              const buffer = isDuplicate ? file.buffer : file.buffer; // Buffer still in memory
              const { text, pageCount } = await extractText(buffer, file.mimetype);
              const sanitisedText = sanitiseTextForAI(text, file.originalname);

              // Chunk the text
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

          // Get document chunks for analysis
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

          // Run AI analysis
          const link = await storage.getDocumentControlLink(document.id, orgControl.id);
          if (link) {
            await storage.updateDocumentControlLink(link.id, { analysisStatus: "analysing" });
          }

          // Soft-delete previous matches for this document+control combination
          await storage.softDeleteMatchesByDocumentAndControl(document.id, orgControl.id);

          // Build organisation context for the AI prompt
          const orgProfile = await storage.getOrganisationProfile();
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

          // Save matches to DB
          for (const match of matches) {
            await storage.createDocumentQuestionMatch({
              documentId: document.id,
              organisationControlId: orgControl.id,
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

          // Update link status
          if (link) {
            await storage.updateDocumentControlLink(link.id, {
              analysisStatus: "analysed",
              analysisCompletedAt: new Date(),
            });
          }

          // Log AI interaction
          await storage.createAiInteraction({
            userId: user.id,
            interactionType: "document_analysis",
            controlId: control.id,
            inputSummary: `Analysed "${document.title}" for ${control.controlNumber}`,
            outputSummary: `${summary.strongMatches} strong, ${summary.partialMatches} partial, ${summary.weakMatches} weak matches. ${summary.evidenceGaps} gaps. ${summary.pendingSuggestions} suggestions.`,
            modelUsed: DEFAULT_MODEL,
            tokensUsed: totalTokensUsed,
          });

          // Send per-document complete event
          res.write(
            `event: document-complete\ndata: ${JSON.stringify({
              documentId: document.id,
              documentTitle: document.title,
              ...summary,
            })}\n\n`
          );
        }

        // Send overall complete event
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

  // Link existing document(s) to a control and trigger analysis
  app.post("/api/organisation-controls/:controlId/documents/link", async (req, res) => {
    try {
      const controlId = parseInt(req.params.controlId);
      if (isNaN(controlId)) {
        return res.status(400).json({ error: "Invalid control ID" });
      }

      const { documentIds } = req.body;
      if (!Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({ error: "documentIds array is required" });
      }

      let orgControl = await storage.getOrganisationControl(controlId);
      if (!orgControl) {
        orgControl = await storage.createOrganisationControl({
          controlId,
          isApplicable: true,
        });
      }

      const user = await storage.getOrCreateDefaultUser();
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
        });
        linked.push({ documentId: document.id, alreadyLinked: false });
      }

      res.status(201).json({ linked });
    } catch (error) {
      console.error("Error linking documents:", error);
      res.status(500).json({ error: "Failed to link documents" });
    }
  });

  // Get all documents for a control
  app.get("/api/organisation-controls/:controlId/documents", async (req, res) => {
    try {
      const controlId = parseInt(req.params.controlId);
      if (isNaN(controlId)) {
        return res.status(400).json({ error: "Invalid control ID" });
      }

      const orgControl = await storage.getOrganisationControl(controlId);
      if (!orgControl) {
        return res.json([]);
      }

      const docs = await storage.getDocumentsByOrgControl(orgControl.id);

      // Enrich each document with its control link metadata
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

  // Unlink document from control (soft-delete matches)
  app.delete("/api/organisation-controls/:controlId/documents/:documentId", async (req, res) => {
    try {
      const controlId = parseInt(req.params.controlId);
      const documentId = parseInt(req.params.documentId);
      if (isNaN(controlId) || isNaN(documentId)) {
        return res.status(400).json({ error: "Invalid control or document ID" });
      }

      const orgControl = await storage.getOrganisationControl(controlId);
      if (!orgControl) {
        return res.status(404).json({ error: "Organisation control not found" });
      }

      // Soft-delete all matches for this document+control
      await storage.softDeleteMatchesByDocumentAndControl(documentId, orgControl.id);

      // Delete the link
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

  // Re-trigger AI analysis for a document-control pair (SSE)
  app.post(
    "/api/organisation-controls/:controlId/documents/:documentId/analyse",
    async (req, res) => {
      const controlId = parseInt(req.params.controlId);
      const documentId = parseInt(req.params.documentId);
      if (isNaN(controlId) || isNaN(documentId)) {
        return res.status(400).json({ error: "Invalid control or document ID" });
      }

      const orgControl = await storage.getOrganisationControl(controlId);
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

      // Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      try {
        const user = await storage.getOrCreateDefaultUser();

        // Update link status
        const link = await storage.getDocumentControlLink(document.id, orgControl.id);
        if (link) {
          await storage.updateDocumentControlLink(link.id, { analysisStatus: "analysing" });
        }

        // Soft-delete previous matches
        await storage.softDeleteMatchesByDocumentAndControl(document.id, orgControl.id);

        // Get chunks
        const dbChunks = await storage.getDocumentChunks(document.id);
        const chunkInputs: DocumentChunkInput[] = dbChunks.map((c) => ({
          chunkIndex: c.chunkIndex,
          content: c.content,
          sectionHeading: c.sectionHeading,
          chunkId: c.id,
        }));

        // Build organisation context
        const orgProfile = await storage.getOrganisationProfile();
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

        // Save matches to DB
        for (const match of matches) {
          await storage.createDocumentQuestionMatch({
            documentId: document.id,
            organisationControlId: orgControl.id,
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

        // Update link status
        if (link) {
          await storage.updateDocumentControlLink(link.id, {
            analysisStatus: "analysed",
            analysisCompletedAt: new Date(),
          });
        }

        // Log AI interaction
        await storage.createAiInteraction({
          userId: user.id,
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

  // Get active AI-generated question matches for a control
  app.get("/api/organisation-controls/:controlId/question-matches", async (req, res) => {
    try {
      const controlId = parseInt(req.params.controlId);
      if (isNaN(controlId)) {
        return res.status(400).json({ error: "Invalid control ID" });
      }

      const orgControl = await storage.getOrganisationControl(controlId);
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

  // Evidence gap analysis for a control
  app.get("/api/organisation-controls/:controlId/evidence-gaps", async (req, res) => {
    try {
      const controlId = parseInt(req.params.controlId);
      if (isNaN(controlId)) {
        return res.status(400).json({ error: "Invalid control ID" });
      }

      const control = await storage.getControlById(controlId);
      if (!control) {
        return res.status(404).json({ error: "Control not found" });
      }

      const questionnaire = control.aiQuestionnaire as ControlQuestionnaire | null;
      if (!questionnaire || !questionnaire.questions) {
        return res.json({ questions: [], totalQuestions: 0, coveredQuestions: 0, gapQuestions: 0 });
      }

      const orgControl = await storage.getOrganisationControl(controlId);
      const matches = orgControl
        ? await storage.getActiveMatchesByOrgControl(orgControl.id)
        : [];

      // Build per-question gap analysis
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

  // Accept a suggestion → write to response + log to changeLog
  app.post("/api/question-matches/:matchId/accept", async (req, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      if (isNaN(matchId)) {
        return res.status(400).json({ error: "Invalid match ID" });
      }

      const match = await storage.getMatchById(matchId);
      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }

      const user = await storage.getOrCreateDefaultUser();

      // Accept the suggestion
      const accepted = await storage.acceptSuggestion(matchId, user.id);

      // Write the suggested response to the questionnaire implementation responses
      const orgControl = await storage.getOrganisationControl(match.organisationControlId);
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

        await storage.updateOrganisationControl(match.organisationControlId, {
          implementationResponses: existingResponses,
          implementationUpdatedAt: new Date(),
        });

        // Log the change
        await storage.createResponseChangeLog({
          organisationControlId: match.organisationControlId,
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

  // Dismiss a suggestion
  app.post("/api/question-matches/:matchId/dismiss", async (req, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      if (isNaN(matchId)) {
        return res.status(400).json({ error: "Invalid match ID" });
      }

      const user = await storage.getOrCreateDefaultUser();
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

  // Accept with user edits
  app.post("/api/question-matches/:matchId/accept-edited", async (req, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      if (isNaN(matchId)) {
        return res.status(400).json({ error: "Invalid match ID" });
      }

      const { editedResponse } = req.body;
      if (!editedResponse || typeof editedResponse !== "string") {
        return res.status(400).json({ error: "editedResponse is required" });
      }

      const match = await storage.getMatchById(matchId);
      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }

      const user = await storage.getOrCreateDefaultUser();

      // Accept the suggestion
      await storage.acceptSuggestion(matchId, user.id);

      // Write the EDITED response to the questionnaire
      const orgControl = await storage.getOrganisationControl(match.organisationControlId);
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

        await storage.updateOrganisationControl(match.organisationControlId, {
          implementationResponses: existingResponses,
          implementationUpdatedAt: new Date(),
        });

        // Log the change as edited acceptance
        await storage.createResponseChangeLog({
          organisationControlId: match.organisationControlId,
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

  // Audit trail for a question's response changes
  app.get(
    "/api/organisation-controls/:controlId/questions/:questionId/history",
    async (req, res) => {
      try {
        const controlId = parseInt(req.params.controlId);
        const questionId = parseInt(req.params.questionId);
        if (isNaN(controlId) || isNaN(questionId)) {
          return res.status(400).json({ error: "Invalid control or question ID" });
        }

        const orgControl = await storage.getOrganisationControl(controlId);
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

  // Dashboard - complete dashboard data
  app.get("/api/dashboard", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // Dashboard stats (legacy endpoint)
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

  // Control Applicability endpoints (must be before :controlNumber route)
  app.get("/api/controls/applicability", async (req, res) => {
    try {
      const applicability = await storage.getControlsApplicability();
      res.json(applicability);
    } catch (error) {
      console.error("Error fetching control applicability:", error);
      res.status(500).json({ error: "Failed to fetch control applicability" });
    }
  });

  app.patch("/api/controls/applicability", async (req, res) => {
    try {
      const { updates } = req.body;
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({ error: "Updates must be an array" });
      }

      const updatedCount = await storage.updateControlsApplicability(updates);
      res.json({ updated: updatedCount });
    } catch (error) {
      console.error("Error updating control applicability:", error);
      res.status(500).json({ error: "Failed to update control applicability" });
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

      const { organisationControlId, status, comments, aiAnalysis, aiSuggestedStatus, aiConfidence, aiContextScope, evidenceLinks: evidenceLinksData } = req.body;

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

      // Persist any evidence links attached to this test run
      if (Array.isArray(evidenceLinksData) && evidenceLinksData.length > 0) {
        for (const ev of evidenceLinksData) {
          await storage.createEvidenceLink({
            testRunId: testRun.id,
            organisationControlId,
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

  // Evidence Links
  app.get("/api/organisation-controls/:controlId/evidence-links", async (req, res) => {
    try {
      const controlId = parseInt(req.params.controlId);
      if (isNaN(controlId)) {
        return res.status(400).json({ error: "Invalid control ID" });
      }

      const orgControl = await storage.getOrganisationControl(controlId);
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

  app.post("/api/organisation-controls/:controlId/evidence-links", async (req, res) => {
    try {
      const controlId = parseInt(req.params.controlId);
      if (isNaN(controlId)) {
        return res.status(400).json({ error: "Invalid control ID" });
      }

      let orgControl = await storage.getOrganisationControl(controlId);
      if (!orgControl) {
        orgControl = await storage.createOrganisationControl({
          controlId,
          isApplicable: true,
        });
      }

      const { title, url, evidenceType, description, questionId } = req.body;
      if (!title || typeof title !== "string") {
        return res.status(400).json({ error: "Title is required" });
      }

      const user = await storage.getOrCreateDefaultUser();
      const link = await storage.createEvidenceLink({
        organisationControlId: orgControl.id,
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

  app.delete("/api/evidence-links/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid evidence link ID" });
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

  // Persona-aware AI analysis with streaming (SSE)
  const analyzeRequestSchema = z.object({
    persona: personaSchema,
    include_history: z.boolean().default(true),
    comments: z.string().default(""),
  });

  app.post("/api/controls/:controlNumber/analyze", async (req, res) => {
    try {
      // Validate request body
      const parseResult = analyzeRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request body", details: parseResult.error.errors });
      }

      const { persona, include_history, comments } = parseResult.data;

      // Get control data
      const control = await storage.getControlByNumber(req.params.controlNumber);
      if (!control) {
        return res.status(404).json({ error: "Control not found" });
      }

      // Check for questionnaire
      const questionnaire = control.aiQuestionnaire;
      if (!questionnaire || !questionnaire.questions || questionnaire.questions.length === 0) {
        return res.status(400).json({ error: "No questionnaire available for this control" });
      }

      // Get implementation responses
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

      // Check if there are any responses
      const hasResponses = responses.some(r => r.response_text?.trim());
      if (!hasResponses && !comments.trim()) {
        return res.status(400).json({ error: "No responses or comments provided for analysis" });
      }

      // Get test history if requested
      let previousTests: TestRunHistory[] = [];
      if (include_history && control.recentTestRuns) {
        previousTests = control.recentTestRuns.slice(0, 3).map(t => ({
          testDate: new Date(t.testDate).toLocaleDateString(),
          status: t.status,
          comments: t.comments,
        }));
      }

      // Get organisation profile for AI context
      const orgProfile = await storage.getOrganisationProfile();
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

      // Convert ontology questions to the AI format
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

      // Set up Server-Sent Events
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      // Stream the analysis
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

      // Log AI interaction
      const user = await storage.getOrCreateDefaultUser();
      await storage.createAiInteraction({
        userId: user.id,
        interactionType: "test_analysis",
        controlId: control.id,
        inputSummary: `${persona} analysis for ${control.controlNumber}`,
        outputSummary: `Status: ${analysis.suggested_status}, Confidence: ${Math.round(analysis.confidence * 100)}%`,
        modelUsed: DEFAULT_MODEL,
        tokensUsed,
      });

      // Send complete event with parsed analysis
      res.write(`event: complete\ndata: ${JSON.stringify(analysis)}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error analyzing control:", error);
      
      if (error instanceof AIConfigurationError) {
        res.status(502).json({ error: error.message });
        return;
      }
      
      // If we've already started streaming, we need to send error as an event
      if (res.headersSent) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: "Analysis failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to analyze control" });
      }
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const aiConfig = checkAIConfiguration();
      const categories = await storage.getCategories();
      const stats = await storage.getDashboardStats();
      
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

  // Test API connection
  app.post("/api/settings/test-api", async (req, res) => {
    try {
      const aiConfig = checkAIConfiguration();
      if (!aiConfig.configured) {
        res.json({ 
          success: false, 
          message: aiConfig.message,
        });
        return;
      }

      // Try a simple API call to verify the key works
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

  // Export test history as CSV
  app.get("/api/export/test-history", async (req, res) => {
    try {
      const testRuns = await storage.getTestRuns();
      
      // CSV header
      const csvHeader = "Test Date,Control Number,Control Name,Status,Tester,Comments,AI Suggested Status,AI Confidence\n";
      
      // Helper to escape CSV values (wrap in quotes and escape internal quotes)
      const escapeCSV = (value: string): string => {
        if (value.includes('"') || value.includes(',') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };
      
      // CSV rows
      const csvRows = testRuns.map(run => {
        const testDate = new Date(run.testDate).toISOString();
        const controlNumber = run.organisationControl?.control?.controlNumber || "";
        const controlName = run.organisationControl?.control?.name || "";
        const status = run.status;
        const tester = run.tester?.name || "";
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

  // Organisation Profile endpoints
  app.get("/api/settings/profile", async (req, res) => {
    try {
      const profile = await storage.getOrganisationProfile();
      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching organisation profile:", error);
      res.status(500).json({ error: "Failed to fetch organisation profile" });
    }
  });

  app.put("/api/settings/profile", async (req, res) => {
    try {
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

      const profile = await storage.upsertOrganisationProfile({
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
