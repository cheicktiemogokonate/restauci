export type TestDataEnvironment = "development" | "test";

interface TestDataEnvironmentInput {
  argv: readonly string[];
  env: Readonly<Record<string, string | undefined>>;
}

export interface VerifiedTestDataEnvironment {
  environment: TestDataEnvironment;
  databaseHost: string;
  databaseName: string;
}

/**
 * Verrou partagé par les opérations qui créent des données d'essai durables.
 * L'origine est déclarative : aucun nom, email ou identifiant de ligne n'est
 * utilisé pour deviner si une donnée est réelle ou synthétique.
 */
export function assertTestDataEnvironment({
  argv,
  env,
}: TestDataEnvironmentInput): VerifiedTestDataEnvironment {
  if (!argv.includes("--confirmed-development-test")) {
    throw new Error(
      "Ajoutez --confirmed-development-test pour confirmer l'opération de données d'essai.",
    );
  }

  if (env.NODE_ENV === "production" || env.VERCEL_ENV === "production") {
    throw new Error(
      "Les données d'essai sont interdites dans un environnement de production.",
    );
  }

  const environment = env.TOUTCI_DATA_ENVIRONMENT;
  if (environment !== "development" && environment !== "test") {
    throw new Error(
      "TOUTCI_DATA_ENVIRONMENT doit valoir development ou test pour créer des données d'essai.",
    );
  }

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL est absente.");
  }

  const databaseUrl = new URL(env.DATABASE_URL);
  if (
    databaseUrl.protocol !== "postgres:" &&
    databaseUrl.protocol !== "postgresql:"
  ) {
    throw new Error("DATABASE_URL doit cibler PostgreSQL.");
  }

  return {
    environment,
    databaseHost: databaseUrl.hostname,
    databaseName: databaseUrl.pathname.replace(/^\//, ""),
  };
}
