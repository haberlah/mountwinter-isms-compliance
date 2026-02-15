import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, pgEnum, real, date, serial, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "compliance_officer", "auditor"]);
export const frequencyEnum = pgEnum("frequency", ["Annual", "Quarterly", "Monthly"]);
export const quarterEnum = pgEnum("quarter", ["Q1", "Q2", "Q3", "Q4"]);
export const testStatusEnum = pgEnum("test_status", ["Pass", "PassPrevious", "Fail", "Blocked", "NotAttempted", "ContinualImprovement"]);
export const interactionTypeEnum = pgEnum("interaction_type", ["questionnaire_generation", "response_review", "test_analysis", "ontology_load", "document_analysis"]);
export const aiContextScopeEnum = pgEnum("ai_context_scope", ["current_only", "last_3", "all_history"]);
export const personaEnum = pgEnum("persona", ["Auditor", "Advisor", "Analyst"]);
export const riskAppetiteEnum = pgEnum("risk_appetite", ["Conservative", "Moderate", "Aggressive"]);
export const evidenceTypeEnum = pgEnum("evidence_type", ["REGISTER", "RECORD", "POLICY", "MATRIX", "DOCUMENT", "OTHER"]);
export const documentStatusEnum = pgEnum("document_status", ["pending", "extracting", "extracted", "analysing", "analysed", "error"]);

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

// Organisation Profile (for AI context and personalization)
export const organisationProfile = pgTable("organisation_profile", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").default(1).notNull(),
  companyName: text("company_name"),
  industry: text("industry"),
  companySize: text("company_size"),
  techStack: text("tech_stack"),
  deploymentModel: text("deployment_model"),
  regulatoryRequirements: jsonb("regulatory_requirements").$type<string[]>().default([]),
  dataClassificationLevels: jsonb("data_classification_levels").$type<string[]>().default([]),
  riskAppetite: riskAppetiteEnum("risk_appetite").default("Moderate"),
  additionalContext: text("additional_context"),
  hideNonApplicableControls: boolean("hide_non_applicable_controls").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Evidence Links (structured evidence per question or test run)
export const evidenceLinks = pgTable("evidence_links", {
  id: serial("id").primaryKey(),
  organisationControlId: integer("organisation_control_id").references(() => organisationControls.id),
  questionId: integer("question_id"),
  testRunId: integer("test_run_id").references(() => testRuns.id),
  title: text("title").notNull(),
  url: text("url"),
  evidenceType: evidenceTypeEnum("evidence_type"),
  description: text("description"),
  documentId: integer("document_id").references(() => documents.id),
  addedByUserId: integer("added_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Documents (central document repository)
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  originalFilename: text("original_filename").notNull(),
  s3Key: text("s3_key").notNull(),
  s3Bucket: text("s3_bucket").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(),
  fileHash: varchar("file_hash", { length: 64 }).notNull(),
  documentDate: timestamp("document_date"),
  evidenceType: evidenceTypeEnum("evidence_type"),
  description: text("description"),
  extractedText: text("extracted_text"),
  extractionStatus: documentStatusEnum("extraction_status").default("pending").notNull(),
  extractionError: text("extraction_error"),
  pageCount: integer("page_count"),
  uploadedByUserId: integer("uploaded_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_documents_file_hash").on(table.fileHash),
  index("idx_documents_evidence_type").on(table.evidenceType),
  index("idx_documents_uploaded_by").on(table.uploadedByUserId),
  index("idx_documents_extraction_status").on(table.extractionStatus),
]);

// Document Chunks (chunked text for large documents)
export const documentChunks = pgTable("document_chunks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  tokenCount: integer("token_count"),
  charStart: integer("char_start").notNull(),
  charEnd: integer("char_end").notNull(),
  sectionHeading: text("section_heading"),
}, (table) => [
  index("idx_doc_chunks_document_id").on(table.documentId),
  index("idx_doc_chunks_document_index").on(table.documentId, table.chunkIndex),
]);

// Document-Control Links (many-to-many documents ↔ organisation controls)
export const documentControlLinks = pgTable("document_control_links", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id, { onDelete: "restrict" }),
  organisationControlId: integer("organisation_control_id").notNull().references(() => organisationControls.id, { onDelete: "restrict" }),
  linkedByUserId: integer("linked_by_user_id").notNull().references(() => users.id),
  analysisStatus: documentStatusEnum("analysis_status").default("pending").notNull(),
  analysisCompletedAt: timestamp("analysis_completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_dcl_unique_doc_control").on(table.documentId, table.organisationControlId),
  index("idx_dcl_document_id").on(table.documentId),
  index("idx_dcl_org_control_id").on(table.organisationControlId),
]);

// Document Question Matches (AI-generated document-to-question mappings — INSERT-only, immutable)
export const documentQuestionMatches = pgTable("document_question_matches", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id, { onDelete: "restrict" }),
  organisationControlId: integer("organisation_control_id").notNull().references(() => organisationControls.id),
  questionId: integer("question_id").notNull(),
  contentRelevance: real("content_relevance").notNull(),
  evidenceTypeMatch: boolean("evidence_type_match").notNull(),
  specificity: real("specificity").notNull(),
  compositeScore: real("composite_score").notNull(),
  matchedPassage: text("matched_passage"),
  aiSummary: text("ai_summary"),
  suggestedResponse: text("suggested_response"),
  userAccepted: boolean("user_accepted"),
  acceptedAt: timestamp("accepted_at"),
  acceptedByUserId: integer("accepted_by_user_id").references(() => users.id),
  isCrossControl: boolean("is_cross_control").default(false).notNull(),
  sourceControlId: integer("source_control_id"),
  chunkId: integer("chunk_id").references(() => documentChunks.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_dqm_document_id").on(table.documentId),
  index("idx_dqm_org_control_id").on(table.organisationControlId),
  index("idx_dqm_question_id").on(table.questionId),
  index("idx_dqm_composite_score").on(table.compositeScore),
  index("idx_dqm_org_control_active").on(table.organisationControlId, table.isActive),
]);

// Response Change Log (immutable audit trail for questionnaire response changes)
export const responseChangeLog = pgTable("response_change_log", {
  id: serial("id").primaryKey(),
  organisationControlId: integer("organisation_control_id").notNull().references(() => organisationControls.id),
  questionId: integer("question_id").notNull(),
  previousResponse: text("previous_response"),
  newResponse: text("new_response").notNull(),
  changeSource: varchar("change_source", { length: 50 }).notNull(),
  sourceDocumentId: integer("source_document_id").references(() => documents.id),
  sourceMatchId: integer("source_match_id").references(() => documentQuestionMatches.id),
  changedByUserId: integer("changed_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_rcl_org_control_question").on(table.organisationControlId, table.questionId),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  organisationControls: many(organisationControls),
  testRuns: many(testRuns),
  aiInteractions: many(aiInteractions),
  evidenceLinks: many(evidenceLinks),
  uploadedDocuments: many(documents),
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
  evidenceLinks: many(evidenceLinks),
  documentControlLinks: many(documentControlLinks),
  documentQuestionMatches: many(documentQuestionMatches),
  responseChangeLogs: many(responseChangeLog),
}));

export const testRunsRelations = relations(testRuns, ({ one, many }) => ({
  organisationControl: one(organisationControls, {
    fields: [testRuns.organisationControlId],
    references: [organisationControls.id],
  }),
  tester: one(users, {
    fields: [testRuns.testerUserId],
    references: [users.id],
  }),
  evidenceLinks: many(evidenceLinks),
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

export const evidenceLinksRelations = relations(evidenceLinks, ({ one }) => ({
  organisationControl: one(organisationControls, {
    fields: [evidenceLinks.organisationControlId],
    references: [organisationControls.id],
  }),
  testRun: one(testRuns, {
    fields: [evidenceLinks.testRunId],
    references: [testRuns.id],
  }),
  addedBy: one(users, {
    fields: [evidenceLinks.addedByUserId],
    references: [users.id],
  }),
  document: one(documents, {
    fields: [evidenceLinks.documentId],
    references: [documents.id],
  }),
}));

// Document relations
export const documentsRelations = relations(documents, ({ one, many }) => ({
  uploadedBy: one(users, {
    fields: [documents.uploadedByUserId],
    references: [users.id],
  }),
  chunks: many(documentChunks),
  controlLinks: many(documentControlLinks),
  questionMatches: many(documentQuestionMatches),
  evidenceLinks: many(evidenceLinks),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, {
    fields: [documentChunks.documentId],
    references: [documents.id],
  }),
}));

export const documentControlLinksRelations = relations(documentControlLinks, ({ one }) => ({
  document: one(documents, {
    fields: [documentControlLinks.documentId],
    references: [documents.id],
  }),
  organisationControl: one(organisationControls, {
    fields: [documentControlLinks.organisationControlId],
    references: [organisationControls.id],
  }),
  linkedBy: one(users, {
    fields: [documentControlLinks.linkedByUserId],
    references: [users.id],
  }),
}));

export const documentQuestionMatchesRelations = relations(documentQuestionMatches, ({ one }) => ({
  document: one(documents, {
    fields: [documentQuestionMatches.documentId],
    references: [documents.id],
  }),
  organisationControl: one(organisationControls, {
    fields: [documentQuestionMatches.organisationControlId],
    references: [organisationControls.id],
  }),
  chunk: one(documentChunks, {
    fields: [documentQuestionMatches.chunkId],
    references: [documentChunks.id],
  }),
  acceptedBy: one(users, {
    fields: [documentQuestionMatches.acceptedByUserId],
    references: [users.id],
  }),
}));

export const responseChangeLogRelations = relations(responseChangeLog, ({ one }) => ({
  organisationControl: one(organisationControls, {
    fields: [responseChangeLog.organisationControlId],
    references: [organisationControls.id],
  }),
  sourceDocument: one(documents, {
    fields: [responseChangeLog.sourceDocumentId],
    references: [documents.id],
  }),
  sourceMatch: one(documentQuestionMatches, {
    fields: [responseChangeLog.sourceMatchId],
    references: [documentQuestionMatches.id],
  }),
  changedBy: one(users, {
    fields: [responseChangeLog.changedByUserId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertControlCategorySchema = createInsertSchema(controlCategories).omit({ id: true });
export const insertControlSchema = createInsertSchema(controls).omit({ id: true });
export const insertOrganisationControlSchema = createInsertSchema(organisationControls).omit({ id: true });
export const insertTestRunSchema = createInsertSchema(testRuns).omit({ id: true, testDate: true, createdAt: true });
export const insertAiInteractionSchema = createInsertSchema(aiInteractions).omit({ id: true, createdAt: true });
export const insertOrganisationProfileSchema = createInsertSchema(organisationProfile).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEvidenceLinkSchema = createInsertSchema(evidenceLinks).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentChunkSchema = createInsertSchema(documentChunks).omit({ id: true });
export const insertDocumentControlLinkSchema = createInsertSchema(documentControlLinks).omit({ id: true, createdAt: true });
export const insertDocumentQuestionMatchSchema = createInsertSchema(documentQuestionMatches).omit({ id: true, createdAt: true });
export const insertResponseChangeLogSchema = createInsertSchema(responseChangeLog).omit({ id: true, createdAt: true });

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

export type OrganisationProfile = typeof organisationProfile.$inferSelect;
export type InsertOrganisationProfile = z.infer<typeof insertOrganisationProfileSchema>;
export type RiskAppetite = 'Conservative' | 'Moderate' | 'Aggressive';

export type EvidenceLink = typeof evidenceLinks.$inferSelect;
export type InsertEvidenceLink = z.infer<typeof insertEvidenceLinkSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type InsertDocumentChunk = z.infer<typeof insertDocumentChunkSchema>;

export type DocumentControlLink = typeof documentControlLinks.$inferSelect;
export type InsertDocumentControlLink = z.infer<typeof insertDocumentControlLinkSchema>;

export type DocumentQuestionMatch = typeof documentQuestionMatches.$inferSelect;
export type InsertDocumentQuestionMatch = z.infer<typeof insertDocumentQuestionMatchSchema>;

export type ResponseChangeLogEntry = typeof responseChangeLog.$inferSelect;
export type InsertResponseChangeLog = z.infer<typeof insertResponseChangeLogSchema>;

export type ControlApplicability = {
  controlId: number;
  controlNumber: string;
  name: string;
  category: string;
  isApplicable: boolean;
};

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
  documentStats?: {
    totalDocuments: number;
    totalFileSize: number;
    controlsWithEvidence: number;
    controlsWithGaps: number;
    documentsByType: Record<string, number>;
    pendingSuggestions: number;
  };
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
  questionnaireProgress?: { total: number; answered: number; percentage: number };
};

export type TestRunWithEvidence = TestRun & {
  evidenceLinks?: EvidenceLink[];
};

export type DocumentWithLinks = Document & {
  controlLinks?: DocumentControlLink[];
  uploadedBy?: User;
};

export type DocumentStats = {
  totalDocuments: number;
  totalFileSize: number;
  controlsWithEvidence: number;
  controlsWithGaps: number;
  documentsByType: Record<string, number>;
  pendingSuggestions: number;
};
