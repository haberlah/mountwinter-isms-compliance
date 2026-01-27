import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, pgEnum, real, date, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "compliance_officer", "auditor"]);
export const frequencyEnum = pgEnum("frequency", ["Annual", "Quarterly", "Monthly"]);
export const quarterEnum = pgEnum("quarter", ["Q1", "Q2", "Q3", "Q4"]);
export const testStatusEnum = pgEnum("test_status", ["Pass", "PassPrevious", "Fail", "Blocked", "NotAttempted", "ContinualImprovement"]);
export const interactionTypeEnum = pgEnum("interaction_type", ["questionnaire_generation", "response_review", "test_analysis", "ontology_load"]);
export const aiContextScopeEnum = pgEnum("ai_context_scope", ["current_only", "last_3", "all_history"]);
export const personaEnum = pgEnum("persona", ["Auditor", "Advisor", "Analyst"]);

// Persona types
export const personaValues = ['Auditor', 'Advisor', 'Analyst'] as const;
export type Persona = typeof personaValues[number];
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

// Ontology question structure
export interface OntologyQuestion {
  question_id: number;
  question: string;
  guidance: string;
  auditor_focus: string;
  evidence_type: string;
  answer_type: string;
  what_good_looks_like: string;
  red_flags: string;
  nc_pattern: string;
  severity: Severity;
  primary_persona: Persona;
  related_controls: string;
  cps234_ref?: string;
  cps230_ref?: string;
}

export interface ControlQuestionnaire {
  questions: OntologyQuestion[];
  metadata: {
    total_questions: number;
    by_persona: Record<Persona, number>;
  };
}

export interface QuestionResponse {
  question_id: number;
  response_text: string;
  evidence_references: string[];
  last_updated: string;
  answered_by_user_id: number;
}

export interface ImplementationResponses {
  responses: QuestionResponse[];
  completion_status: {
    total: number;
    answered: number;
    by_persona: Record<Persona, { total: number; answered: number }>;
  };
}

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).unique().default("admin@local").notNull(),
  name: text("name").default("Admin").notNull(),
  role: userRoleEnum("role").default("admin").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Control Categories
export const controlCategories = pgTable("control_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Controls (90 ISO 27001:2022 controls)
export const controls = pgTable("controls", {
  id: serial("id").primaryKey(),
  controlNumber: varchar("control_number", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").notNull().references(() => controlCategories.id),
  ownerRole: text("owner_role"),
  defaultFrequency: frequencyEnum("default_frequency").default("Annual"),
  startQuarter: quarterEnum("start_quarter").default("Q1"),
  cps234Reference: text("cps234_reference"),
  cps230Reference: text("cps230_reference"),
  annexAReference: text("annex_a_reference"),
  aiQuestionnaire: jsonb("ai_questionnaire").$type<ControlQuestionnaire>(),
  questionnaireGeneratedAt: timestamp("questionnaire_generated_at"),
});

// Organisation Controls (per-control settings)
export const organisationControls = pgTable("organisation_controls", {
  id: serial("id").primaryKey(),
  controlId: integer("control_id").notNull().references(() => controls.id).unique(),
  assignedUserId: integer("assigned_user_id").references(() => users.id),
  frequency: frequencyEnum("frequency"),
  startQuarter: quarterEnum("start_quarter"),
  isApplicable: boolean("is_applicable").notNull().default(true),
  exclusionJustification: text("exclusion_justification"),
  nextDueDate: date("next_due_date"),
  selectedPersona: varchar("selected_persona", { length: 20 }).default("Auditor"),
  implementationResponses: jsonb("implementation_responses").$type<ImplementationResponses>(),
  implementationUpdatedAt: timestamp("implementation_updated_at"),
});

// Test Runs (immutable audit trail - INSERT ONLY)
export const testRuns = pgTable("test_runs", {
  id: serial("id").primaryKey(),
  organisationControlId: integer("organisation_control_id").notNull().references(() => organisationControls.id),
  testDate: timestamp("test_date").defaultNow().notNull(),
  testerUserId: integer("tester_user_id").notNull().references(() => users.id),
  status: testStatusEnum("status").notNull(),
  comments: text("comments"),
  aiAnalysis: text("ai_analysis"),
  aiSuggestedStatus: testStatusEnum("ai_suggested_status"),
  aiConfidence: real("ai_confidence"),
  aiContextScope: aiContextScopeEnum("ai_context_scope"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI Interactions (audit log of all AI API calls)
export const aiInteractions = pgTable("ai_interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  interactionType: interactionTypeEnum("interaction_type").notNull(),
  controlId: integer("control_id").references(() => controls.id),
  testRunId: integer("test_run_id").references(() => testRuns.id),
  inputSummary: text("input_summary"),
  outputSummary: text("output_summary"),
  modelUsed: varchar("model_used", { length: 100 }).notNull(),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  organisationControls: many(organisationControls),
  testRuns: many(testRuns),
  aiInteractions: many(aiInteractions),
}));

export const controlCategoriesRelations = relations(controlCategories, ({ many }) => ({
  controls: many(controls),
}));

export const controlsRelations = relations(controls, ({ one, many }) => ({
  category: one(controlCategories, {
    fields: [controls.categoryId],
    references: [controlCategories.id],
  }),
  organisationControl: one(organisationControls),
  aiInteractions: many(aiInteractions),
}));

export const organisationControlsRelations = relations(organisationControls, ({ one, many }) => ({
  control: one(controls, {
    fields: [organisationControls.controlId],
    references: [controls.id],
  }),
  assignedUser: one(users, {
    fields: [organisationControls.assignedUserId],
    references: [users.id],
  }),
  testRuns: many(testRuns),
}));

export const testRunsRelations = relations(testRuns, ({ one }) => ({
  organisationControl: one(organisationControls, {
    fields: [testRuns.organisationControlId],
    references: [organisationControls.id],
  }),
  tester: one(users, {
    fields: [testRuns.testerUserId],
    references: [users.id],
  }),
}));

export const aiInteractionsRelations = relations(aiInteractions, ({ one }) => ({
  user: one(users, {
    fields: [aiInteractions.userId],
    references: [users.id],
  }),
  control: one(controls, {
    fields: [aiInteractions.controlId],
    references: [controls.id],
  }),
  testRun: one(testRuns, {
    fields: [aiInteractions.testRunId],
    references: [testRuns.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertControlCategorySchema = createInsertSchema(controlCategories).omit({ id: true });
export const insertControlSchema = createInsertSchema(controls).omit({ id: true });
export const insertOrganisationControlSchema = createInsertSchema(organisationControls).omit({ id: true });
export const insertTestRunSchema = createInsertSchema(testRuns).omit({ id: true, testDate: true, createdAt: true });
export const insertAiInteractionSchema = createInsertSchema(aiInteractions).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ControlCategory = typeof controlCategories.$inferSelect;
export type InsertControlCategory = z.infer<typeof insertControlCategorySchema>;

export type Control = typeof controls.$inferSelect;
export type InsertControl = z.infer<typeof insertControlSchema>;

export type OrganisationControl = typeof organisationControls.$inferSelect;
export type InsertOrganisationControl = z.infer<typeof insertOrganisationControlSchema>;

export type TestRun = typeof testRuns.$inferSelect;
export type InsertTestRun = z.infer<typeof insertTestRunSchema>;

export type AiInteraction = typeof aiInteractions.$inferSelect;
export type InsertAiInteraction = z.infer<typeof insertAiInteractionSchema>;

// Extended types for API responses
export type ControlWithCategory = Control & {
  category: ControlCategory;
};

export type ControlWithDetails = Control & {
  category: ControlCategory;
  organisationControl?: OrganisationControl | null;
  recentTestRuns?: TestRun[];
};

export type OrganisationControlWithControl = OrganisationControl & {
  control: Control & { category: ControlCategory };
};

export type TestRunWithDetails = TestRun & {
  organisationControl: OrganisationControl & {
    control: Control;
  };
  tester: User;
};

export type DashboardStats = {
  totalControls: number;
  applicableControls: number;
  testedControls: number;
  passedControls: number;
  failedControls: number;
  notTestedControls: number;
  blockedControls: number;
  continualImprovementControls: number;
  compliancePercentage: number;
  questionnaireProgress: {
    totalQuestions: number;
    answeredQuestions: number;
    percentage: number;
    controlsComplete: number;
    controlsPartial: number;
    controlsNotStarted: number;
  };
  categoryBreakdown: Array<{
    categoryId: number;
    categoryName: string;
    total: number;
    passed: number;
    failed: number;
    notTested: number;
  }>;
  dueSoon: Array<{
    controlNumber: string;
    controlName: string;
    dueDate: string;
    daysUntilDue: number;
    lastTested: string | null;
  }>;
  recentActivity: Array<{
    testDate: string;
    controlNumber: string;
    controlName: string;
    status: string;
    testerName: string;
  }>;
  recentTestRuns: TestRunWithDetails[];
};

export type ControlsStats = {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  notAttempted: number;
};

export type ControlWithLatestTest = Control & {
  category: ControlCategory;
  organisationControl: OrganisationControl | null;
  latestTestRun: TestRun | null;
};
