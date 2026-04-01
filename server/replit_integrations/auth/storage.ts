import { users, organisationEmailDomains, type User, type UpsertUser } from "@shared/schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existing = await this.getUser(userData.id!);

    if (existing) {
      const [user] = await db
        .update(users)
        .set({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
      return user;
    }

    let organisationId: number | null = null;
    if (userData.email) {
      const domain = userData.email.split("@")[1];
      if (domain) {
        const [match] = await db
          .select()
          .from(organisationEmailDomains)
          .where(eq(organisationEmailDomains.domain, domain.toLowerCase()));
        if (match) {
          organisationId = match.organisationId;
        }
      }
    }

    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        organisationId,
        role: "admin",
      })
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
