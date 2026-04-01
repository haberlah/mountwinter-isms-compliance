import {
  users, controlCategories, controls, organisationControls, testRuns, aiInteractions, organisationProfile, evidenceLinks,
  documents, documentChunks, documentControlLinks, documentQuestionMatches, responseChangeLog,
  organisations, organisationEmailDomains,
  type User, type InsertUser,
  type ControlCategory, type InsertControlCategory,
  type Control, type InsertControl,
  type OrganisationControl, type InsertOrganisationControl,
  type TestRun, type InsertTestRun,
  type AiInteraction, type InsertAiInteraction,
  type OrganisationProfile, type InsertOrganisationProfile,
  type EvidenceLink, type InsertEvidenceLink,
  type Document, type InsertDocument,
  type DocumentChunk, type InsertDocumentChunk,
  type DocumentControlLink, type InsertDocumentControlLink,
  type DocumentQuestionMatch, type InsertDocumentQuestionMatch,
  type ResponseChangeLogEntry, type InsertResponseChangeLog,
  type DashboardStats, type ControlWithDetails, type TestRunWithDetails,
  type ControlsStats, type ControlWithLatestTest, type ControlApplicability,
  type DocumentStats,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, isNull, count, asc, inArray, sum, ilike } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Categories
  getCategories(): Promise<ControlCategory[]>;
  createCategory(category: InsertControlCategory): Promise<ControlCategory>;
  getCategoryCount(): Promise<number>;

  // Controls
  getControls(orgId: number): Promise<(Control & { category: ControlCategory; organisationControl: OrganisationControl | null })[]>;
  getControlsWithLatestTest(orgId: number): Promise<ControlWithLatestTest[]>;
  getControlsStats(orgId: number): Promise<ControlsStats>;
  getControlByNumber(controlNumber: string, orgId: number): Promise<ControlWithDetails | undefined>;
  getControlById(id: number): Promise<Control | undefined>;
  createControl(control: InsertControl): Promise<Control>;
  updateControlQuestionnaire(controlId: number, questionnaire: any, generatedAt: Date): Promise<void>;
  getControlCount(): Promise<number>;

  // Organisation Controls
  getOrganisationControl(controlId: number, orgId: number): Promise<OrganisationControl | undefined>;
  createOrganisationControl(orgControl: InsertOrganisationControl): Promise<OrganisationControl>;
  updateOrganisationControl(controlId: number, orgId: number, updates: Partial<OrganisationControl>): Promise<OrganisationControl | undefined>;

  // Test Runs (INSERT ONLY - immutable)
  getTestRuns(orgId: number): Promise<TestRunWithDetails[]>;
  getTestRunsByOrganisationControl(orgControlId: number): Promise<TestRun[]>;
  createTestRun(testRun: InsertTestRun): Promise<TestRun>;
  getRecentTestRuns(limit: number, orgId: number): Promise<TestRunWithDetails[]>;

  // AI Interactions
  getAiInteractions(orgId: number): Promise<AiInteraction[]>;
  createAiInteraction(interaction: InsertAiInteraction): Promise<AiInteraction>;

  // Dashboard
  getDashboardStats(orgId: number): Promise<DashboardStats>;

  // Organisation Profile
  getOrganisationProfile(orgId: number): Promise<OrganisationProfile | undefined>;
  upsertOrganisationProfile(orgId: number, profile: Partial<InsertOrganisationProfile>): Promise<OrganisationProfile>;

  // Control Applicability
  getControlsApplicability(orgId: number): Promise<ControlApplicability[]>;
  updateControlsApplicability(orgId: number, updates: { controlId: number; isApplicable: boolean }[]): Promise<number>;

  // Evidence Links
  getEvidenceLinksByOrgControl(orgControlId: number, questionId?: number): Promise<EvidenceLink[]>;
  getEvidenceLinksByTestRun(testRunId: number): Promise<EvidenceLink[]>;
  createEvidenceLink(link: InsertEvidenceLink): Promise<EvidenceLink>;
  deleteEvidenceLink(id: number): Promise<boolean>;

  // Documents
  createDocument(data: InsertDocument): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  updateDocument(id: number, data: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  forceDeleteDocument(id: number): Promise<boolean>;
  deleteAllDocuments(orgId: number): Promise<{ deletedCount: number; s3Keys: string[] }>;
  getDocumentByHash(fileHash: string, orgId: number): Promise<Document | undefined>;
  getAllDocuments(orgId: number, options?: { search?: string; type?: string; page?: number; limit?: number }): Promise<{ documents: Document[]; total: number }>;
  getDocumentStats(orgId: number): Promise<DocumentStats>;

  // Document Chunks
  createDocumentChunks(documentId: number, chunks: Omit<InsertDocumentChunk, "documentId">[]): Promise<DocumentChunk[]>;
  getDocumentChunks(documentId: number): Promise<DocumentChunk[]>;

  // Document-Control Links
  createDocumentControlLink(data: InsertDocumentControlLink): Promise<DocumentControlLink>;
  deleteDocumentControlLink(documentId: number, orgControlId: number): Promise<boolean>;
  getDocumentsByOrgControl(orgControlId: number): Promise<Document[]>;
  getDocumentControlLink(documentId: number, orgControlId: number): Promise<DocumentControlLink | undefined>;
  updateDocumentControlLink(id: number, data: Partial<DocumentControlLink>): Promise<DocumentControlLink | undefined>;

  // Document Question Matches
  createDocumentQuestionMatch(data: InsertDocumentQuestionMatch): Promise<DocumentQuestionMatch>;
  softDeleteMatchesByDocumentAndControl(documentId: number, orgControlId: number): Promise<number>;
  getActiveMatchesByOrgControl(orgControlId: number): Promise<DocumentQuestionMatch[]>;
  acceptSuggestion(matchId: number, userId: string): Promise<DocumentQuestionMatch | undefined>;
  dismissSuggestion(matchId: number, userId: string): Promise<DocumentQuestionMatch | undefined>;
  getMatchById(matchId: number): Promise<DocumentQuestionMatch | undefined>;

  // Response Change Log
  createResponseChangeLog(data: InsertResponseChangeLog): Promise<ResponseChangeLogEntry>;
  getResponseHistory(orgControlId: number, questionId: number): Promise<ResponseChangeLogEntry[]>;

  // Reset
  resetAssessmentData(orgId: number): Promise<{ testRunsCleared: number; aiInteractionsCleared: number; controlsReset: number }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Categories
  async getCategories(): Promise<ControlCategory[]> {
    return db.select().from(controlCategories).orderBy(asc(controlCategories.sortOrder));
  }

  async createCategory(category: InsertControlCategory): Promise<ControlCategory> {
    const [cat] = await db.insert(controlCategories).values(category).returning();
    return cat;
  }

  async getCategoryCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(controlCategories);
    return result[0]?.count || 0;
  }

  // Controls
  async getControls(orgId: number): Promise<(Control & { category: ControlCategory; organisationControl: OrganisationControl | null })[]> {
    const result = await db
      .select()
      .from(controls)
      .innerJoin(controlCategories, eq(controls.categoryId, controlCategories.id))
      .leftJoin(organisationControls, and(
        eq(controls.id, organisationControls.controlId),
        eq(organisationControls.organisationId, orgId)
      ))
      .orderBy(asc(controlCategories.sortOrder), asc(controls.controlNumber));

    return result.map((row) => ({
      ...row.controls,
      category: row.control_categories,
      organisationControl: row.organisation_controls,
    }));
  }

  async getControlsWithLatestTest(orgId: number): Promise<ControlWithLatestTest[]> {
    const result = await db
      .select()
      .from(controls)
      .innerJoin(controlCategories, eq(controls.categoryId, controlCategories.id))
      .leftJoin(organisationControls, and(
        eq(controls.id, organisationControls.controlId),
        eq(organisationControls.organisationId, orgId)
      ))
      .orderBy(asc(controlCategories.sortOrder), asc(controls.controlNumber));

    const allTestRuns = await db
      .select()
      .from(testRuns)
      .where(eq(testRuns.organisationId, orgId))
      .orderBy(desc(testRuns.testDate));

    const latestTestByOrgControl = new Map<number, TestRun>();
    for (const run of allTestRuns) {
      if (!latestTestByOrgControl.has(run.organisationControlId)) {
        latestTestByOrgControl.set(run.organisationControlId, run);
      }
    }

    return result.map((row) => {
      const orgControl = row.organisation_controls;
      const latestTestRun = orgControl ? latestTestByOrgControl.get(orgControl.id) || null : null;

      let questionnaireProgress: { total: number; answered: number; percentage: number } | undefined;
      const questionnaire = row.controls.aiQuestionnaire as any;
      if (questionnaire?.questions?.length) {
        const total = questionnaire.questions.length;
        const responses = orgControl?.implementationResponses as any;
        let answered = 0;
        if (responses?.responses) {
          for (const r of responses.responses) {
            if (r.response_text?.trim()) answered++;
          }
        }
        questionnaireProgress = { total, answered, percentage: Math.round((answered / total) * 100) };
      }

      return {
        ...row.controls,
        category: row.control_categories,
        organisationControl: orgControl,
        latestTestRun,
        questionnaireProgress,
      };
    });
  }

  async getControlsStats(orgId: number): Promise<ControlsStats> {
    const controlsWithTests = await this.getControlsWithLatestTest(orgId);

    let passed = 0;
    let failed = 0;
    let blocked = 0;
    let notAttempted = 0;

    for (const control of controlsWithTests) {
      const latestTest = control.latestTestRun;
      if (!latestTest) {
        notAttempted++;
        continue;
      }

      switch (latestTest.status) {
        case "Pass":
        case "PassPrevious":
        case "ContinualImprovement":
          passed++;
          break;
        case "Fail":
          failed++;
          break;
        case "Blocked":
          blocked++;
          break;
        case "NotAttempted":
        default:
          notAttempted++;
          break;
      }
    }

    return {
      total: controlsWithTests.length,
      passed,
      failed,
      blocked,
      notAttempted,
    };
  }

  async getControlByNumber(controlNumber: string, orgId: number): Promise<ControlWithDetails | undefined> {
    const result = await db
      .select()
      .from(controls)
      .innerJoin(controlCategories, eq(controls.categoryId, controlCategories.id))
      .leftJoin(organisationControls, and(
        eq(controls.id, organisationControls.controlId),
        eq(organisationControls.organisationId, orgId)
      ))
      .where(eq(controls.controlNumber, controlNumber));

    if (result.length === 0) return undefined;

    const row = result[0];
    const orgControl = row.organisation_controls;

    let recentTestRuns: any[] = [];
    if (orgControl) {
      const runs = await db
        .select()
        .from(testRuns)
        .where(eq(testRuns.organisationControlId, orgControl.id))
        .orderBy(desc(testRuns.testDate))
        .limit(10);

      for (const run of runs) {
        const links = await this.getEvidenceLinksByTestRun(run.id);
        recentTestRuns.push({ ...run, evidenceLinks: links });
      }
    }

    return {
      ...row.controls,
      category: row.control_categories,
      organisationControl: orgControl,
      recentTestRuns,
    };
  }

  async getControlById(id: number): Promise<Control | undefined> {
    const [control] = await db.select().from(controls).where(eq(controls.id, id));
    return control || undefined;
  }

  async createControl(control: InsertControl): Promise<Control> {
    const [c] = await db.insert(controls).values(control as any).returning();
    return c;
  }

  async updateControlQuestionnaire(controlId: number, questionnaire: any, generatedAt: Date): Promise<void> {
    await db
      .update(controls)
      .set({ aiQuestionnaire: questionnaire, questionnaireGeneratedAt: generatedAt })
      .where(eq(controls.id, controlId));
  }

  async getControlCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(controls);
    return result[0]?.count || 0;
  }

  // Organisation Controls
  async getOrganisationControl(controlId: number, orgId: number): Promise<OrganisationControl | undefined> {
    const [orgControl] = await db
      .select()
      .from(organisationControls)
      .where(and(
        eq(organisationControls.controlId, controlId),
        eq(organisationControls.organisationId, orgId)
      ));
    return orgControl || undefined;
  }

  async createOrganisationControl(orgControl: InsertOrganisationControl): Promise<OrganisationControl> {
    const [oc] = await db.insert(organisationControls).values(orgControl as any).returning();
    return oc;
  }

  async updateOrganisationControl(controlId: number, orgId: number, updates: Partial<OrganisationControl>): Promise<OrganisationControl | undefined> {
    const [updated] = await db
      .update(organisationControls)
      .set(updates)
      .where(and(
        eq(organisationControls.controlId, controlId),
        eq(organisationControls.organisationId, orgId)
      ))
      .returning();
    return updated || undefined;
  }

  // Test Runs
  async getTestRuns(orgId: number): Promise<TestRunWithDetails[]> {
    const result = await db
      .select()
      .from(testRuns)
      .innerJoin(organisationControls, eq(testRuns.organisationControlId, organisationControls.id))
      .innerJoin(controls, eq(organisationControls.controlId, controls.id))
      .innerJoin(users, eq(testRuns.testerUserId, users.id))
      .where(eq(testRuns.organisationId, orgId))
      .orderBy(desc(testRuns.testDate));

    return result.map((row) => ({
      ...row.test_runs,
      organisationControl: {
        ...row.organisation_controls,
        control: row.controls,
      },
      tester: row.users,
    }));
  }

  async getTestRunsByOrganisationControl(orgControlId: number): Promise<TestRun[]> {
    return db
      .select()
      .from(testRuns)
      .where(eq(testRuns.organisationControlId, orgControlId))
      .orderBy(desc(testRuns.testDate));
  }

  async createTestRun(testRun: InsertTestRun): Promise<TestRun> {
    const [tr] = await db.insert(testRuns).values(testRun).returning();
    return tr;
  }

  async getRecentTestRuns(limit: number, orgId: number): Promise<TestRunWithDetails[]> {
    const result = await db
      .select()
      .from(testRuns)
      .innerJoin(organisationControls, eq(testRuns.organisationControlId, organisationControls.id))
      .innerJoin(controls, eq(organisationControls.controlId, controls.id))
      .innerJoin(users, eq(testRuns.testerUserId, users.id))
      .where(eq(testRuns.organisationId, orgId))
      .orderBy(desc(testRuns.testDate))
      .limit(limit);

    return result.map((row) => ({
      ...row.test_runs,
      organisationControl: {
        ...row.organisation_controls,
        control: row.controls,
      },
      tester: row.users,
    }));
  }

  // AI Interactions
  async getAiInteractions(orgId: number): Promise<AiInteraction[]> {
    return db.select().from(aiInteractions).where(eq(aiInteractions.organisationId, orgId)).orderBy(desc(aiInteractions.createdAt));
  }

  async createAiInteraction(interaction: InsertAiInteraction): Promise<AiInteraction> {
    const [ai] = await db.insert(aiInteractions).values(interaction).returning();
    return ai;
  }

  // Dashboard Stats
  async getDashboardStats(orgId: number): Promise<DashboardStats> {
    const allControls = await this.getControls(orgId);
    const totalControls = allControls.length;

    const applicableControls = allControls.filter(
      (c) => c.organisationControl?.isApplicable !== false
    );
    const applicableCount = applicableControls.length;

    const latestTestRuns = await db
      .select({
        organisationControlId: testRuns.organisationControlId,
        status: testRuns.status,
        testDate: testRuns.testDate,
      })
      .from(testRuns)
      .where(eq(testRuns.organisationId, orgId))
      .orderBy(desc(testRuns.testDate));

    const latestByOrgControl = new Map<number, { status: string; testDate: Date }>();
    for (const run of latestTestRuns) {
      if (!latestByOrgControl.has(run.organisationControlId)) {
        latestByOrgControl.set(run.organisationControlId, {
          status: run.status,
          testDate: run.testDate
        });
      }
    }

    let passedControls = 0;
    let failedControls = 0;
    let notTestedControls = 0;
    let testedControls = 0;
    let blockedControls = 0;
    let continualImprovementControls = 0;

    for (const control of applicableControls) {
      const orgControl = control.organisationControl;
      if (!orgControl) {
        notTestedControls++;
        continue;
      }

      const latestTest = latestByOrgControl.get(orgControl.id);
      if (!latestTest) {
        notTestedControls++;
        continue;
      }

      testedControls++;
      if (latestTest.status === "Pass" || latestTest.status === "PassPrevious") {
        passedControls++;
      } else if (latestTest.status === "ContinualImprovement") {
        passedControls++;
        continualImprovementControls++;
      } else if (latestTest.status === "Fail") {
        failedControls++;
      } else if (latestTest.status === "Blocked") {
        blockedControls++;
      } else {
        notTestedControls++;
      }
    }

    const compliancePercentage = applicableCount > 0
      ? (passedControls / applicableCount) * 100
      : 0;

    let totalQuestions = 0;
    let answeredQuestions = 0;
    let controlsComplete = 0;
    let controlsPartial = 0;
    let controlsNotStarted = 0;

    for (const control of allControls) {
      const questionnaire = control.aiQuestionnaire as { questions?: { question_id: number }[] } | null;
      const questionCount = questionnaire?.questions?.length || 0;
      totalQuestions += questionCount;

      const orgControl = control.organisationControl;
      const responses = (orgControl?.implementationResponses as { responses?: { question_id: number; response_text?: string }[] } | null)?.responses || [];
      const answeredCount = responses.filter(r => r.response_text?.trim()).length;
      answeredQuestions += answeredCount;

      if (questionCount > 0) {
        if (answeredCount === 0) {
          controlsNotStarted++;
        } else if (answeredCount >= questionCount) {
          controlsComplete++;
        } else {
          controlsPartial++;
        }
      }
    }

    const questionnairePercentage = totalQuestions > 0
      ? (answeredQuestions / totalQuestions) * 100
      : 0;

    const categories = await this.getCategories();
    const categoryBreakdown = categories.map((cat) => {
      const catControls = applicableControls.filter((c) => c.categoryId === cat.id);
      let passed = 0, failed = 0, notTested = 0;

      for (const control of catControls) {
        const orgControl = control.organisationControl;
        if (!orgControl) {
          notTested++;
          continue;
        }

        const latestTest = latestByOrgControl.get(orgControl.id);
        if (!latestTest) {
          notTested++;
          continue;
        }

        if (latestTest.status === "Pass" || latestTest.status === "PassPrevious" || latestTest.status === "ContinualImprovement") {
          passed++;
        } else if (latestTest.status === "Fail") {
          failed++;
        } else {
          notTested++;
        }
      }

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        total: catControls.length,
        passed,
        failed,
        notTested,
      };
    });

    const dueSoon = applicableControls
      .filter((c) => c.organisationControl?.nextDueDate)
      .map((c) => {
        const latestTest = c.organisationControl ? latestByOrgControl.get(c.organisationControl.id) : null;
        return {
          controlNumber: c.controlNumber,
          controlName: c.name,
          dueDate: c.organisationControl!.nextDueDate!,
          daysUntilDue: Math.ceil(
            (new Date(c.organisationControl!.nextDueDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          ),
          lastTested: latestTest ? latestTest.testDate.toISOString() : null,
        };
      })
      .filter((c) => c.daysUntilDue <= 30)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
      .slice(0, 10);

    const recentTestRuns = await this.getRecentTestRuns(10, orgId);
    const recentActivity = recentTestRuns.map(run => ({
      testDate: run.testDate.toISOString(),
      controlNumber: run.organisationControl.control.controlNumber,
      controlName: run.organisationControl.control.name,
      status: run.status,
      testerName: [run.tester.firstName, run.tester.lastName].filter(Boolean).join(" ") || "Unknown",
    }));

    const docStats = await this.getDocumentStats(orgId);

    return {
      totalControls,
      applicableControls: applicableCount,
      testedControls,
      passedControls,
      failedControls,
      notTestedControls,
      blockedControls,
      continualImprovementControls,
      compliancePercentage,
      questionnaireProgress: {
        totalQuestions,
        answeredQuestions,
        percentage: questionnairePercentage,
        controlsComplete,
        controlsPartial,
        controlsNotStarted,
      },
      categoryBreakdown,
      dueSoon,
      recentActivity,
      recentTestRuns,
      documentStats: docStats,
    };
  }

  // Organisation Profile
  async getOrganisationProfile(orgId: number): Promise<OrganisationProfile | undefined> {
    const [profile] = await db.select().from(organisationProfile).where(eq(organisationProfile.organisationId, orgId));
    return profile || undefined;
  }

  async upsertOrganisationProfile(orgId: number, profile: Partial<InsertOrganisationProfile>): Promise<OrganisationProfile> {
    const existing = await this.getOrganisationProfile(orgId);

    if (existing) {
      const [updated] = await db
        .update(organisationProfile)
        .set({
          ...profile,
          updatedAt: new Date(),
        } as any)
        .where(eq(organisationProfile.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(organisationProfile)
        .values({
          organisationId: orgId,
          ...profile,
        } as any)
        .returning();
      return created;
    }
  }

  // Control Applicability
  async getControlsApplicability(orgId: number): Promise<ControlApplicability[]> {
    const result = await db
      .select({
        controlId: controls.id,
        controlNumber: controls.controlNumber,
        name: controls.name,
        category: controlCategories.name,
        isApplicable: organisationControls.isApplicable,
      })
      .from(controls)
      .innerJoin(controlCategories, eq(controls.categoryId, controlCategories.id))
      .innerJoin(organisationControls, and(
        eq(controls.id, organisationControls.controlId),
        eq(organisationControls.organisationId, orgId)
      ))
      .orderBy(asc(controlCategories.sortOrder), asc(controls.controlNumber));

    return result.map(row => ({
      controlId: row.controlId,
      controlNumber: row.controlNumber,
      name: row.name,
      category: row.category,
      isApplicable: row.isApplicable,
    }));
  }

  async updateControlsApplicability(orgId: number, updates: { controlId: number; isApplicable: boolean }[]): Promise<number> {
    let updatedCount = 0;

    for (const update of updates) {
      const result = await db
        .update(organisationControls)
        .set({ isApplicable: update.isApplicable })
        .where(and(
          eq(organisationControls.controlId, update.controlId),
          eq(organisationControls.organisationId, orgId)
        ))
        .returning();

      if (result.length > 0) {
        updatedCount++;
      }
    }

    return updatedCount;
  }

  // Evidence Links
  async getEvidenceLinksByOrgControl(orgControlId: number, questionId?: number): Promise<EvidenceLink[]> {
    const conditions = [eq(evidenceLinks.organisationControlId, orgControlId)];
    if (questionId !== undefined) {
      conditions.push(eq(evidenceLinks.questionId, questionId));
    }
    return db
      .select()
      .from(evidenceLinks)
      .where(and(...conditions))
      .orderBy(desc(evidenceLinks.createdAt));
  }

  async getEvidenceLinksByTestRun(testRunId: number): Promise<EvidenceLink[]> {
    return db
      .select()
      .from(evidenceLinks)
      .where(eq(evidenceLinks.testRunId, testRunId))
      .orderBy(desc(evidenceLinks.createdAt));
  }

  async createEvidenceLink(link: InsertEvidenceLink): Promise<EvidenceLink> {
    const [el] = await db.insert(evidenceLinks).values(link).returning();
    return el;
  }

  async deleteEvidenceLink(id: number): Promise<boolean> {
    const result = await db.delete(evidenceLinks).where(eq(evidenceLinks.id, id)).returning();
    return result.length > 0;
  }

  // Documents
  async createDocument(data: InsertDocument): Promise<Document> {
    const [doc] = await db.insert(documents).values(data).returning();
    return doc;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc || undefined;
  }

  async updateDocument(id: number, data: Partial<Document>): Promise<Document | undefined> {
    const [doc] = await db
      .update(documents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return doc || undefined;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id)).returning();
    return result.length > 0;
  }

  async forceDeleteDocument(id: number): Promise<boolean> {
    return db.transaction(async (tx) => {
      await tx.update(responseChangeLog)
        .set({ sourceDocumentId: null, sourceMatchId: null })
        .where(eq(responseChangeLog.sourceDocumentId, id));
      await tx.update(evidenceLinks)
        .set({ documentId: null })
        .where(eq(evidenceLinks.documentId, id));
      await tx.delete(documentQuestionMatches).where(eq(documentQuestionMatches.documentId, id));
      await tx.delete(documentControlLinks).where(eq(documentControlLinks.documentId, id));
      const result = await tx.delete(documents).where(eq(documents.id, id)).returning();
      return result.length > 0;
    });
  }

  async deleteAllDocuments(orgId: number): Promise<{ deletedCount: number; s3Keys: string[] }> {
    return db.transaction(async (tx) => {
      const allDocs = await tx.select({ id: documents.id, s3Key: documents.s3Key }).from(documents).where(eq(documents.organisationId, orgId));
      if (allDocs.length === 0) return { deletedCount: 0, s3Keys: [] };
      const docIds = allDocs.map(d => d.id);
      await tx.update(responseChangeLog)
        .set({ sourceDocumentId: null, sourceMatchId: null })
        .where(inArray(responseChangeLog.sourceDocumentId, docIds));
      await tx.update(evidenceLinks)
        .set({ documentId: null })
        .where(inArray(evidenceLinks.documentId, docIds));
      await tx.delete(documentQuestionMatches).where(inArray(documentQuestionMatches.documentId, docIds));
      await tx.delete(documentControlLinks).where(inArray(documentControlLinks.documentId, docIds));
      await tx.delete(documentChunks).where(inArray(documentChunks.documentId, docIds));
      await tx.delete(documents).where(inArray(documents.id, docIds));
      return { deletedCount: allDocs.length, s3Keys: allDocs.map(d => d.s3Key) };
    });
  }

  async getDocumentByHash(fileHash: string, orgId: number): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(and(
      eq(documents.fileHash, fileHash),
      eq(documents.organisationId, orgId)
    ));
    return doc || undefined;
  }

  async getAllDocuments(orgId: number, options?: { search?: string; type?: string; page?: number; limit?: number }): Promise<{ documents: Document[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [eq(documents.organisationId, orgId)];
    if (options?.search) {
      conditions.push(
        or(
          ilike(documents.title, `%${options.search}%`),
          ilike(documents.originalFilename, `%${options.search}%`),
        )
      );
    }
    if (options?.type) {
      conditions.push(eq(documents.evidenceType, options.type as any));
    }

    const whereClause = and(...conditions);

    const [totalResult, docs] = await Promise.all([
      db.select({ count: count() }).from(documents).where(whereClause),
      db
        .select()
        .from(documents)
        .where(whereClause)
        .orderBy(desc(documents.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    return {
      documents: docs,
      total: totalResult[0]?.count || 0,
    };
  }

  async getDocumentStats(orgId: number): Promise<DocumentStats> {
    const orgCondition = eq(documents.organisationId, orgId);

    const [docAgg] = await db
      .select({
        totalDocuments: count(),
        totalFileSize: sum(documents.fileSize),
      })
      .from(documents)
      .where(orgCondition);

    const typeRows = await db
      .select({
        evidenceType: documents.evidenceType,
        count: count(),
      })
      .from(documents)
      .where(orgCondition)
      .groupBy(documents.evidenceType);

    const documentsByType: Record<string, number> = {};
    for (const row of typeRows) {
      documentsByType[row.evidenceType || "UNTYPED"] = row.count;
    }

    const controlsWithDocs = await db
      .selectDistinct({ orgControlId: documentControlLinks.organisationControlId })
      .from(documentControlLinks)
      .where(eq(documentControlLinks.organisationId, orgId));
    const controlsWithEvidence = controlsWithDocs.length;

    const [pendingResult] = await db
      .select({ count: count() })
      .from(documentQuestionMatches)
      .where(
        and(
          eq(documentQuestionMatches.isActive, true),
          isNull(documentQuestionMatches.userAccepted),
          eq(documentQuestionMatches.organisationId, orgId),
        )
      );

    const [totalApplicable] = await db
      .select({ count: count() })
      .from(organisationControls)
      .where(and(
        eq(organisationControls.isApplicable, true),
        eq(organisationControls.organisationId, orgId)
      ));
    const controlsWithGaps = Math.max(0, (totalApplicable?.count || 0) - controlsWithEvidence);

    return {
      totalDocuments: docAgg?.totalDocuments || 0,
      totalFileSize: Number(docAgg?.totalFileSize) || 0,
      controlsWithEvidence,
      controlsWithGaps,
      documentsByType,
      pendingSuggestions: pendingResult?.count || 0,
    };
  }

  // Document Chunks
  async createDocumentChunks(documentId: number, chunks: Omit<InsertDocumentChunk, "documentId">[]): Promise<DocumentChunk[]> {
    if (chunks.length === 0) return [];
    const values = chunks.map((chunk) => ({ ...chunk, documentId }));
    return db.insert(documentChunks).values(values).returning();
  }

  async getDocumentChunks(documentId: number): Promise<DocumentChunk[]> {
    return db
      .select()
      .from(documentChunks)
      .where(eq(documentChunks.documentId, documentId))
      .orderBy(asc(documentChunks.chunkIndex));
  }

  // Document-Control Links
  async createDocumentControlLink(data: InsertDocumentControlLink): Promise<DocumentControlLink> {
    const [link] = await db.insert(documentControlLinks).values(data).returning();
    return link;
  }

  async deleteDocumentControlLink(documentId: number, orgControlId: number): Promise<boolean> {
    const result = await db
      .delete(documentControlLinks)
      .where(
        and(
          eq(documentControlLinks.documentId, documentId),
          eq(documentControlLinks.organisationControlId, orgControlId),
        )
      )
      .returning();
    return result.length > 0;
  }

  async getDocumentsByOrgControl(orgControlId: number): Promise<Document[]> {
    const links = await db
      .select({ documentId: documentControlLinks.documentId })
      .from(documentControlLinks)
      .where(eq(documentControlLinks.organisationControlId, orgControlId));

    if (links.length === 0) return [];

    const docIds = links.map((l) => l.documentId);
    return db
      .select()
      .from(documents)
      .where(inArray(documents.id, docIds))
      .orderBy(desc(documents.createdAt));
  }

  async getDocumentControlLink(documentId: number, orgControlId: number): Promise<DocumentControlLink | undefined> {
    const [link] = await db
      .select()
      .from(documentControlLinks)
      .where(
        and(
          eq(documentControlLinks.documentId, documentId),
          eq(documentControlLinks.organisationControlId, orgControlId),
        )
      );
    return link || undefined;
  }

  async updateDocumentControlLink(id: number, data: Partial<DocumentControlLink>): Promise<DocumentControlLink | undefined> {
    const [link] = await db
      .update(documentControlLinks)
      .set(data)
      .where(eq(documentControlLinks.id, id))
      .returning();
    return link || undefined;
  }

  // Document Question Matches
  async createDocumentQuestionMatch(data: InsertDocumentQuestionMatch): Promise<DocumentQuestionMatch> {
    const [match] = await db.insert(documentQuestionMatches).values(data).returning();
    return match;
  }

  async softDeleteMatchesByDocumentAndControl(documentId: number, orgControlId: number): Promise<number> {
    const result = await db
      .update(documentQuestionMatches)
      .set({ isActive: false })
      .where(
        and(
          eq(documentQuestionMatches.documentId, documentId),
          eq(documentQuestionMatches.organisationControlId, orgControlId),
          eq(documentQuestionMatches.isActive, true),
        )
      )
      .returning();
    return result.length;
  }

  async getActiveMatchesByOrgControl(orgControlId: number): Promise<DocumentQuestionMatch[]> {
    return db
      .select()
      .from(documentQuestionMatches)
      .where(
        and(
          eq(documentQuestionMatches.organisationControlId, orgControlId),
          eq(documentQuestionMatches.isActive, true),
        )
      )
      .orderBy(desc(documentQuestionMatches.compositeScore));
  }

  async acceptSuggestion(matchId: number, userId: string): Promise<DocumentQuestionMatch | undefined> {
    const [match] = await db
      .update(documentQuestionMatches)
      .set({
        userAccepted: true,
        acceptedAt: new Date(),
        acceptedByUserId: userId,
      })
      .where(eq(documentQuestionMatches.id, matchId))
      .returning();
    return match || undefined;
  }

  async dismissSuggestion(matchId: number, userId: string): Promise<DocumentQuestionMatch | undefined> {
    const [match] = await db
      .update(documentQuestionMatches)
      .set({
        userAccepted: false,
        acceptedAt: new Date(),
        acceptedByUserId: userId,
      })
      .where(eq(documentQuestionMatches.id, matchId))
      .returning();
    return match || undefined;
  }

  async getMatchById(matchId: number): Promise<DocumentQuestionMatch | undefined> {
    const [match] = await db
      .select()
      .from(documentQuestionMatches)
      .where(eq(documentQuestionMatches.id, matchId));
    return match || undefined;
  }

  // Response Change Log
  async createResponseChangeLog(data: InsertResponseChangeLog): Promise<ResponseChangeLogEntry> {
    const [entry] = await db.insert(responseChangeLog).values(data).returning();
    return entry;
  }

  async getResponseHistory(orgControlId: number, questionId: number): Promise<ResponseChangeLogEntry[]> {
    return db
      .select()
      .from(responseChangeLog)
      .where(
        and(
          eq(responseChangeLog.organisationControlId, orgControlId),
          eq(responseChangeLog.questionId, questionId),
        )
      )
      .orderBy(desc(responseChangeLog.createdAt));
  }
  // ─── Reset ─────────────────────────────────────────────────────────────────

  async resetAssessmentData(orgId: number): Promise<{ testRunsCleared: number; aiInteractionsCleared: number; controlsReset: number }> {
    return db.transaction(async (tx) => {
      const testRunResult = await tx.select({ count: count() }).from(testRuns).where(eq(testRuns.organisationId, orgId));
      const aiResult = await tx.select({ count: count() }).from(aiInteractions).where(eq(aiInteractions.organisationId, orgId));

      await tx.delete(responseChangeLog).where(eq(responseChangeLog.organisationId, orgId));
      await tx.delete(evidenceLinks).where(eq(evidenceLinks.organisationId, orgId));
      await tx.delete(documentQuestionMatches).where(eq(documentQuestionMatches.organisationId, orgId));
      await tx.delete(testRuns).where(eq(testRuns.organisationId, orgId));
      await tx.delete(aiInteractions).where(eq(aiInteractions.organisationId, orgId));

      const controlsResult = await tx
        .update(organisationControls)
        .set({ implementationResponses: null, implementationUpdatedAt: null })
        .where(eq(organisationControls.organisationId, orgId))
        .returning();

      return {
        testRunsCleared: testRunResult[0]?.count || 0,
        aiInteractionsCleared: aiResult[0]?.count || 0,
        controlsReset: controlsResult.length,
      };
    });
  }
}

export const storage = new DatabaseStorage();
