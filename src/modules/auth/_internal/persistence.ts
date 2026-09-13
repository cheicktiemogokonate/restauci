import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/infrastructure/db";
import { users } from "@/infrastructure/db/schema";

export function findUserCredentialsByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
    columns: {
      id: true,
      email: true,
      nom: true,
      role: true,
      password: true,
      suspendu: true,
    },
  });
}

export function findActiveUserIdentity(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      nom: true,
      role: true,
      suspendu: true,
    },
  });
}

export async function insertPartnerUser(input: {
  id: string;
  email: string;
  passwordHash: string;
  nom: string;
  telephone: string;
}) {
  await db.insert(users).values({
    id: input.id,
    email: input.email,
    password: input.passwordHash,
    nom: input.nom,
    telephone: input.telephone,
    role: "partner",
  });
  return {
    id: input.id,
    email: input.email,
    nom: input.nom,
    role: "partner" as const,
  };
}
