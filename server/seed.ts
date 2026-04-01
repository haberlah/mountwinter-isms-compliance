import { db } from "./db";
import { controlCategories, controls, organisations, organisationEmailDomains } from "@shared/schema";
import { count, eq } from "drizzle-orm";
import { loadOntology } from "./load-ontology";

async function seedOrganisation(): Promise<void> {
  const [existing] = await db
    .select()
    .from(organisations)
    .where(eq(organisations.slug, "bella-slainte"));

  if (existing) {
    console.log("Organisation 'Bella Sláinte' already exists. Skipping org seed.");
    return;
  }

  const [org] = await db
    .insert(organisations)
    .values({ name: "Bella Sláinte", slug: "bella-slainte" })
    .returning();

  await db.insert(organisationEmailDomains).values({
    organisationId: org.id,
    domain: "bellamed.ai",
  });

  console.log(`Seeded organisation "${org.name}" (id=${org.id}) with domain bellamed.ai`);
}

export async function seedDatabase(): Promise<void> {
  console.log("Checking if database needs seeding...");

  await seedOrganisation();

  const [{ count: controlCount }] = await db.select({ count: count() }).from(controls);

  if (controlCount === 100) {
    console.log("Ontology already loaded with 100 controls. Skipping.");
    return;
  }

  if (controlCount > 0 && controlCount !== 100) {
    console.log(`Found ${controlCount} controls (expected 100 from ontology).`);
    console.log("Running ontology migration to upgrade to 100 controls...");
    await loadOntology();
    return;
  }

  console.log("Fresh database detected. Loading ontology...");
  await loadOntology();
}
