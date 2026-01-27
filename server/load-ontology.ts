import { db } from "./db";
import { controlCategories, controls, organisationControls, users, aiInteractions, testRuns, type ControlQuestionnaire, type OntologyQuestion, type Persona } from "@shared/schema";
import { eq, count, sql } from "drizzle-orm";
import ontologyData from "../seed-data/iso_27001_ontology.json";

interface OntologyControl {
  control_number: string;
  control_name: string;
  category: string;
  questions: Array<{
    question_id: number;
    question: string;
    guidance: string;
    auditor_focus: string;
    evidence_type: string;
    answer_type: string;
    what_good_looks_like: string;
    red_flags: string;
    nc_pattern: string;
    severity: string;
    primary_persona: string;
    related_controls: string;
    cps234_ref?: string;
    cps230_ref?: string;
  }>;
}

interface OntologyData {
  metadata: {
    version: string;
    standard: string;
    total_controls: number;
    total_questions: number;
    categories: string[];
  };
  controls: OntologyControl[];
}

const categoryMapping: Record<string, number> = {
  "ISMS Requirements": 1,
  "Organisational Controls": 2,
  "People Controls": 3,
  "Physical Controls": 4,
  "Technological Controls": 5,
};

const ownerRoleMapping: Record<string, string> = {
  "ISMS Requirements": "IS",
  "Organisational Controls": "IS",
  "People Controls": "HR",
  "Physical Controls": "Facilities",
  "Technological Controls": "SOC Team",
};

function getPersonaCounts(questions: OntologyControl["questions"]): Record<Persona, number> {
  const counts: Record<Persona, number> = { Auditor: 0, Advisor: 0, Analyst: 0 };
  for (const q of questions) {
    const persona = q.primary_persona as Persona;
    if (counts[persona] !== undefined) {
      counts[persona]++;
    }
  }
  return counts;
}

function transformQuestions(questions: OntologyControl["questions"]): OntologyQuestion[] {
  return questions.map(q => ({
    question_id: q.question_id,
    question: q.question,
    guidance: q.guidance,
    auditor_focus: q.auditor_focus,
    evidence_type: q.evidence_type,
    answer_type: q.answer_type,
    what_good_looks_like: q.what_good_looks_like,
    red_flags: q.red_flags,
    nc_pattern: q.nc_pattern,
    severity: q.severity as "Critical" | "High" | "Medium" | "Low",
    primary_persona: q.primary_persona as Persona,
    related_controls: q.related_controls,
    cps234_ref: q.cps234_ref || "",
    cps230_ref: q.cps230_ref || "",
  }));
}

function getCps234Reference(questions: OntologyControl["questions"]): string | null {
  const refs = new Set<string>();
  for (const q of questions) {
    if (q.cps234_ref) {
      q.cps234_ref.split(";").map(r => r.trim()).filter(r => r).forEach(r => refs.add(r));
    }
  }
  return refs.size > 0 ? Array.from(refs).join("; ") : null;
}

function getCps230Reference(questions: OntologyControl["questions"]): string | null {
  const refs = new Set<string>();
  for (const q of questions) {
    if (q.cps230_ref) {
      q.cps230_ref.split(";").map(r => r.trim()).filter(r => r).forEach(r => refs.add(r));
    }
  }
  return refs.size > 0 ? Array.from(refs).join("; ") : null;
}

export async function loadOntology(): Promise<void> {
  console.log("=".repeat(60));
  console.log("ONTOLOGY MIGRATION");
  console.log("=".repeat(60));
  
  const data = ontologyData as OntologyData;
  console.log(`Loading ontology v${data.metadata.version}`);
  console.log(`Standard: ${data.metadata.standard}`);
  console.log(`Total controls: ${data.metadata.total_controls}`);
  console.log(`Total questions: ${data.metadata.total_questions}`);
  console.log("");

  // Ensure we have a default user
  let defaultUser;
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    defaultUser = existingUsers[0];
  } else {
    [defaultUser] = await db
      .insert(users)
      .values({
        email: "admin@local",
        name: "Admin",
        role: "admin",
      })
      .returning();
  }
  console.log(`Using user: ${defaultUser.name} (ID: ${defaultUser.id})`);

  // Check for existing test_runs (we'll warn the user they will be deleted)
  const [{ count: testRunCount }] = await db.select({ count: count() }).from(testRuns);
  if (testRunCount > 0) {
    console.log("");
    console.log("WARNING: Found existing test_runs records.");
    console.log("Test history will be RESET during this migration.");
    console.log("");
  }

  // Clear existing data in proper order (respect foreign keys)
  console.log("Clearing existing data...");
  await db.delete(testRuns);
  console.log("Cleared test_runs table.");
  await db.delete(organisationControls);
  console.log("Cleared organisation_controls table.");
  // Clear ai_interactions that reference controls (preserve general ones if any)
  await db.execute(sql`DELETE FROM ai_interactions WHERE control_id IS NOT NULL`);
  console.log("Cleared ai_interactions referencing controls.");
  await db.delete(controls);
  console.log("Cleared controls table.");

  // Ensure categories exist
  const [{ count: catCount }] = await db.select({ count: count() }).from(controlCategories);
  if (catCount === 0) {
    console.log("Creating control categories...");
    const categories = [
      { name: "ISMS Requirements", sortOrder: 1 },
      { name: "Organisational Controls", sortOrder: 2 },
      { name: "People Controls", sortOrder: 3 },
      { name: "Physical Controls", sortOrder: 4 },
      { name: "Technological Controls", sortOrder: 5 },
    ];
    for (const cat of categories) {
      await db.insert(controlCategories).values(cat);
    }
    console.log("Created 5 control categories.");
  }

  // Insert controls from ontology
  console.log("");
  console.log("Loading controls from ontology...");
  let totalQuestions = 0;
  const personaTotals: Record<Persona, number> = { Auditor: 0, Advisor: 0, Analyst: 0 };

  for (const ctrl of data.controls) {
    const categoryId = categoryMapping[ctrl.category];
    if (!categoryId) {
      console.error(`Unknown category: ${ctrl.category} for control ${ctrl.control_number}`);
      continue;
    }

    const questions = transformQuestions(ctrl.questions);
    const personaCounts = getPersonaCounts(ctrl.questions);
    
    const questionnaire: ControlQuestionnaire = {
      questions,
      metadata: {
        total_questions: questions.length,
        by_persona: personaCounts,
      },
    };

    // Get first question's guidance as description
    const description = ctrl.questions.length > 0 ? ctrl.questions[0].guidance : null;

    const [insertedControl] = await db
      .insert(controls)
      .values({
        controlNumber: ctrl.control_number,
        name: ctrl.control_name,
        description,
        categoryId,
        ownerRole: ownerRoleMapping[ctrl.category],
        defaultFrequency: "Annual" as const,
        startQuarter: "Q1" as const,
        cps234Reference: getCps234Reference(ctrl.questions),
        cps230Reference: getCps230Reference(ctrl.questions),
        annexAReference: null,
        aiQuestionnaire: questionnaire,
        questionnaireGeneratedAt: new Date(),
      })
      .returning();

    // Create organisation_control for each control
    await db.insert(organisationControls).values({
      controlId: insertedControl.id,
      isApplicable: true,
      frequency: "Annual" as const,
      startQuarter: "Q1" as const,
      selectedPersona: "Auditor",
    });

    totalQuestions += questions.length;
    personaTotals.Auditor += personaCounts.Auditor;
    personaTotals.Advisor += personaCounts.Advisor;
    personaTotals.Analyst += personaCounts.Analyst;
  }

  // Log the migration as an AI interaction
  await db.insert(aiInteractions).values({
    userId: defaultUser.id,
    interactionType: "ontology_load" as const,
    inputSummary: `Ontology bulk load from iso_27001_ontology.json v${data.metadata.version}`,
    outputSummary: `${data.controls.length} controls, ${totalQuestions} questions loaded. Personas: Auditor=${personaTotals.Auditor}, Advisor=${personaTotals.Advisor}, Analyst=${personaTotals.Analyst}`,
    modelUsed: "ontology-import",
    tokensUsed: 0,
  });

  console.log("");
  console.log("=".repeat(60));
  console.log("ONTOLOGY MIGRATION COMPLETE");
  console.log("=".repeat(60));
  console.log(`Controls loaded: ${data.controls.length}`);
  console.log(`Questions loaded: ${totalQuestions}`);
  console.log(`Persona distribution:`);
  console.log(`  - Auditor: ${personaTotals.Auditor}`);
  console.log(`  - Advisor: ${personaTotals.Advisor}`);
  console.log(`  - Analyst: ${personaTotals.Analyst}`);
  console.log("");
  console.log("NOTE: Previous test history has been reset.");
  console.log("This is expected for the ontology upgrade.");
  console.log("=".repeat(60));
}
