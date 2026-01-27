import { db } from "./db";
import { controlCategories, controls, organisationControls, users } from "@shared/schema";
import { count } from "drizzle-orm";
import seedData from "../seed-data/controls.json";

export async function seedDatabase(): Promise<void> {
  console.log("Checking if database needs seeding...");

  // Check if controls already exist
  const [{ count: controlCount }] = await db.select({ count: count() }).from(controls);
  
  if (controlCount > 0) {
    console.log(`Database already seeded with ${controlCount} controls. Skipping.`);
    return;
  }

  console.log("Seeding database...");

  // Create default user
  console.log("Creating default user...");
  const [defaultUser] = await db
    .insert(users)
    .values({
      email: "admin@local",
      name: "Admin",
      role: "admin",
    })
    .returning();
  console.log(`Created user: ${defaultUser.name} (ID: ${defaultUser.id})`);

  // Insert categories
  console.log("Inserting control categories...");
  for (const cat of seedData.categories) {
    await db.insert(controlCategories).values({
      name: cat.name,
      sortOrder: cat.sortOrder,
    });
  }
  console.log(`Inserted ${seedData.categories.length} categories`);

  // Insert controls
  console.log("Inserting controls...");
  for (const ctrl of seedData.controls) {
    const [insertedControl] = await db
      .insert(controls)
      .values({
        controlNumber: ctrl.controlNumber,
        name: ctrl.name,
        description: ctrl.description,
        categoryId: ctrl.categoryId,
        ownerRole: ctrl.ownerRole,
        defaultFrequency: ctrl.defaultFrequency as "Annual" | "Quarterly" | "Monthly",
        startQuarter: ctrl.startQuarter as "Q1" | "Q2" | "Q3" | "Q4",
        cps234Reference: ctrl.cps234Reference,
        cps230Reference: ctrl.cps230Reference,
        annexAReference: ctrl.annexAReference,
      })
      .returning();

    // Create organisation_control for each control
    await db.insert(organisationControls).values({
      controlId: insertedControl.id,
      isApplicable: true,
      frequency: ctrl.defaultFrequency as "Annual" | "Quarterly" | "Monthly",
      startQuarter: ctrl.startQuarter as "Q1" | "Q2" | "Q3" | "Q4",
    });
  }
  console.log(`Inserted ${seedData.controls.length} controls with organisation settings`);

  console.log("Database seeding complete!");
}
