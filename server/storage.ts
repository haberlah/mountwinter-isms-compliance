import { 
  users, controlCategories, controls, organisationControls, testRuns, aiInteractions,
  type User, type InsertUser, 
  type ControlCategory, type InsertControlCategory,
  type Control, type InsertControl,
  type OrganisationControl, type InsertOrganisationControl,
  type TestRun, type InsertTestRun,
  type AiInteraction, type InsertAiInteraction,
  type DashboardStats, type ControlWithDetails, type TestRunWithDetails,
  type ControlsStats, type ControlWithLatestTest
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
      return {
        ...row.controls,
        category: row.control_categories,
        organisationControl: orgControl,
        latestTestRun,
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

    let recentTestRuns: TestRun[] = [];
    if (orgControl) {
      recentTestRuns = await db
        .select()
        .from(testRuns)
        .where(eq(testRuns.organisationControlId, orgControl.id))
        .orderBy(desc(testRuns.testDate))
        .limit(10);
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
    const [c] = await db.insert(controls).values(control).returning();
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
    const [oc] = await db.insert(organisationControls).values(orgControl).returning();
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
      if (latestTest.status === "Pass" || latestTest.status === "PassPrevious" || latestTest.status === "ContinualImprovement") {
        passedControls++;
      } else if (latestTest.status === "Fail") {
        failedControls++;
      } else {
        notTestedControls++;
      }
    }

    const compliancePercentage = applicableCount > 0 
      ? (passedControls / applicableCount) * 100 
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

    // Upcoming tests (controls with next due date set)
    const controlsWithDueDates = applicableControls
      .filter((c) => c.organisationControl?.nextDueDate)
      .map((c) => ({
        controlNumber: c.controlNumber,
        controlName: c.name,
        nextDueDate: c.organisationControl!.nextDueDate!,
        daysUntilDue: Math.ceil(
          (new Date(c.organisationControl!.nextDueDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      }))
      .filter((c) => c.daysUntilDue >= 0)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
      .slice(0, 10);

    const recentTestRuns = await this.getRecentTestRuns(5);

    return {
      totalControls,
      applicableControls: applicableCount,
      testedControls,
      passedControls,
      failedControls,
      notTestedControls,
      compliancePercentage,
      categoryBreakdown,
      upcomingTests: controlsWithDueDates,
      recentTestRuns,
    };
  }
}

export const storage = new DatabaseStorage();
