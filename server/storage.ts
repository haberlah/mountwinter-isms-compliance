import {
  users, controlCategories, controls, organisationControls, testRuns, aiInteractions, organisationProfile, evidenceLinks,
  type User, type InsertUser,
  type ControlCategory, type InsertControlCategory,
  type Control, type InsertControl,
  type OrganisationControl, type InsertOrganisationControl,
  type TestRun, type InsertTestRun,
  type AiInteraction, type InsertAiInteraction,
  type OrganisationProfile, type InsertOrganisationProfile,
  type EvidenceLink, type InsertEvidenceLink,
  type DashboardStats, type ControlWithDetails, type TestRunWithDetails,
  type ControlsStats, type ControlWithLatestTest, type ControlApplicability
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, isNull, count, asc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getOrCreateDefaultUser(): Promise<User>;

  // Categories
  getCategories(): Promise<ControlCategory[]>;
  createCategory(category: InsertControlCategory): Promise<ControlCategory>;
  getCategoryCount(): Promise<number>;

  // Controls
  getControls(): Promise<(Control & { category: ControlCategory; organisationControl: OrganisationControl | null })[]>;
  getControlsWithLatestTest(): Promise<ControlWithLatestTest[]>;
  getControlsStats(): Promise<ControlsStats>;
  getControlByNumber(controlNumber: string): Promise<ControlWithDetails | undefined>;
  getControlById(id: number): Promise<Control | undefined>;
  createControl(control: InsertControl): Promise<Control>;
  updateControlQuestionnaire(controlId: number, questionnaire: any, generatedAt: Date): Promise<void>;
  getControlCount(): Promise<number>;

  // Organisation Controls
  getOrganisationControl(controlId: number): Promise<OrganisationControl | undefined>;
  createOrganisationControl(orgControl: InsertOrganisationControl): Promise<OrganisationControl>;
  updateOrganisationControl(controlId: number, updates: Partial<OrganisationControl>): Promise<OrganisationControl | undefined>;

  // Test Runs (INSERT ONLY - immutable)
  getTestRuns(): Promise<TestRunWithDetails[]>;
  getTestRunsByOrganisationControl(orgControlId: number): Promise<TestRun[]>;
  createTestRun(testRun: InsertTestRun): Promise<TestRun>;
  getRecentTestRuns(limit: number): Promise<TestRunWithDetails[]>;

  // AI Interactions
  getAiInteractions(): Promise<AiInteraction[]>;
  createAiInteraction(interaction: InsertAiInteraction): Promise<AiInteraction>;

  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;

  // Organisation Profile
  getOrganisationProfile(): Promise<OrganisationProfile | undefined>;
  upsertOrganisationProfile(profile: Partial<InsertOrganisationProfile>): Promise<OrganisationProfile>;
  
  // Control Applicability
  getControlsApplicability(): Promise<ControlApplicability[]>;
  updateControlsApplicability(updates: { controlId: number; isApplicable: boolean }[]): Promise<number>;

  // Evidence Links
  getEvidenceLinksByOrgControl(orgControlId: number, questionId?: number): Promise<EvidenceLink[]>;
  getEvidenceLinksByTestRun(testRunId: number): Promise<EvidenceLink[]>;
  createEvidenceLink(link: InsertEvidenceLink): Promise<EvidenceLink>;
  deleteEvidenceLink(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
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

  async getOrCreateDefaultUser(): Promise<User> {
    let user = await this.getUserByEmail("admin@local");
    if (!user) {
      user = await this.createUser({ email: "admin@local", name: "Admin", role: "admin" });
    }
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
  async getControls(): Promise<(Control & { category: ControlCategory; organisationControl: OrganisationControl | null })[]> {
    const result = await db
      .select()
      .from(controls)
      .innerJoin(controlCategories, eq(controls.categoryId, controlCategories.id))
      .leftJoin(organisationControls, eq(controls.id, organisationControls.controlId))
      .orderBy(asc(controlCategories.sortOrder), asc(controls.controlNumber));

    return result.map((row) => ({
      ...row.controls,
      category: row.control_categories,
      organisationControl: row.organisation_controls,
    }));
  }

  async getControlsWithLatestTest(): Promise<ControlWithLatestTest[]> {
    const result = await db
      .select()
      .from(controls)
      .innerJoin(controlCategories, eq(controls.categoryId, controlCategories.id))
      .leftJoin(organisationControls, eq(controls.id, organisationControls.controlId))
      .orderBy(asc(controlCategories.sortOrder), asc(controls.controlNumber));

    const allTestRuns = await db
      .select()
      .from(testRuns)
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

      // Compute questionnaire progress
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

  async getControlsStats(): Promise<ControlsStats> {
    const controlsWithTests = await this.getControlsWithLatestTest();
    
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

  async getControlByNumber(controlNumber: string): Promise<ControlWithDetails | undefined> {
    const result = await db
      .select()
      .from(controls)
      .innerJoin(controlCategories, eq(controls.categoryId, controlCategories.id))
      .leftJoin(organisationControls, eq(controls.id, organisationControls.controlId))
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

      // Attach evidence links to each test run
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
  async getOrganisationControl(controlId: number): Promise<OrganisationControl | undefined> {
    const [orgControl] = await db
      .select()
      .from(organisationControls)
      .where(eq(organisationControls.controlId, controlId));
    return orgControl || undefined;
  }

  async createOrganisationControl(orgControl: InsertOrganisationControl): Promise<OrganisationControl> {
    const [oc] = await db.insert(organisationControls).values(orgControl as any).returning();
    return oc;
  }

  async updateOrganisationControl(controlId: number, updates: Partial<OrganisationControl>): Promise<OrganisationControl | undefined> {
    const [updated] = await db
      .update(organisationControls)
      .set(updates)
      .where(eq(organisationControls.controlId, controlId))
      .returning();
    return updated || undefined;
  }

  // Test Runs
  async getTestRuns(): Promise<TestRunWithDetails[]> {
    const result = await db
      .select()
      .from(testRuns)
      .innerJoin(organisationControls, eq(testRuns.organisationControlId, organisationControls.id))
      .innerJoin(controls, eq(organisationControls.controlId, controls.id))
      .innerJoin(users, eq(testRuns.testerUserId, users.id))
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

  async getRecentTestRuns(limit: number): Promise<TestRunWithDetails[]> {
    const result = await db
      .select()
      .from(testRuns)
      .innerJoin(organisationControls, eq(testRuns.organisationControlId, organisationControls.id))
      .innerJoin(controls, eq(organisationControls.controlId, controls.id))
      .innerJoin(users, eq(testRuns.testerUserId, users.id))
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
  async getAiInteractions(): Promise<AiInteraction[]> {
    return db.select().from(aiInteractions).orderBy(desc(aiInteractions.createdAt));
  }

  async createAiInteraction(interaction: InsertAiInteraction): Promise<AiInteraction> {
    const [ai] = await db.insert(aiInteractions).values(interaction).returning();
    return ai;
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const allControls = await this.getControls();
    const totalControls = allControls.length;

    const applicableControls = allControls.filter(
      (c) => c.organisationControl?.isApplicable !== false
    );
    const applicableCount = applicableControls.length;

    // Get latest test run status for each organisation control
    const latestTestRuns = await db
      .select({
        organisationControlId: testRuns.organisationControlId,
        status: testRuns.status,
        testDate: testRuns.testDate,
      })
      .from(testRuns)
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

    // Questionnaire progress calculation
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

    // Category breakdown
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

    // Due soon - controls due in next 30 days (including overdue)
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

    // Recent activity - last 10 test runs with details
    const recentTestRuns = await this.getRecentTestRuns(10);
    const recentActivity = recentTestRuns.map(run => ({
      testDate: run.testDate.toISOString(),
      controlNumber: run.organisationControl.control.controlNumber,
      controlName: run.organisationControl.control.name,
      status: run.status,
      testerName: run.tester.name,
    }));

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
    };
  }

  // Organisation Profile
  async getOrganisationProfile(): Promise<OrganisationProfile | undefined> {
    const [profile] = await db.select().from(organisationProfile).where(eq(organisationProfile.organisationId, 1));
    return profile || undefined;
  }

  async upsertOrganisationProfile(profile: Partial<InsertOrganisationProfile>): Promise<OrganisationProfile> {
    const existing = await this.getOrganisationProfile();
    
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
          organisationId: 1,
          ...profile,
        } as any)
        .returning();
      return created;
    }
  }

  // Control Applicability
  async getControlsApplicability(): Promise<ControlApplicability[]> {
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
      .innerJoin(organisationControls, eq(controls.id, organisationControls.controlId))
      .orderBy(asc(controlCategories.sortOrder), asc(controls.controlNumber));

    return result.map(row => ({
      controlId: row.controlId,
      controlNumber: row.controlNumber,
      name: row.name,
      category: row.category,
      isApplicable: row.isApplicable,
    }));
  }

  async updateControlsApplicability(updates: { controlId: number; isApplicable: boolean }[]): Promise<number> {
    let updatedCount = 0;

    for (const update of updates) {
      const result = await db
        .update(organisationControls)
        .set({ isApplicable: update.isApplicable })
        .where(eq(organisationControls.controlId, update.controlId))
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
}

export const storage = new DatabaseStorage();
