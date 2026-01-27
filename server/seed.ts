import { db } from "./db";
import { controlCategories, controls, organisationControls, users } from "@shared/schema";
import { count } from "drizzle-orm";
import { loadOntology } from "./load-ontology";

export async function seedDatabase(): Promise<void> {
  console.log("Checking if database needs seeding...");

  // Check if controls already exist
  const [{ count: controlCount }] = await db.select({ count: count() }).from(controls);
  
  // If we have exactly 100 controls, ontology is already loaded
  if (controlCount === 100) {
    console.log("Ontology already loaded with 100 controls. Skipping.");
    return;
  }
  
  // If we have other number of controls (e.g., 90 from old seed), run ontology migration
  if (controlCount > 0 && controlCount !== 100) {
    console.log(`Found ${controlCount} controls (expected 100 from ontology).`);
    console.log("Running ontology migration to upgrade to 100 controls...");
    await loadOntology();
    return;
  }

  // Fresh database - load ontology directly
  console.log("Fresh database detected. Loading ontology...");
  await loadOntology();
}
