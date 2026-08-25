import type { Config } from "drizzle-kit"
import { readFileSync } from "fs"
import { resolve } from "path"

const isTestDatabase = process.env.TEST_DATABASE === "true"
const dotenvPath = resolve(
  process.cwd(),
  isTestDatabase ? ".env.test.local" : ".env.local",
)

const fileValues: Record<string, string> = {}
try {
  const env = readFileSync(dotenvPath, "utf8")
  env.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) return
    const [key, ...rest] = trimmed.split("=")
    const value = rest.join("=").trim().replace(/^(['"])(.*)\1$/, "$2")
    if (key && value) fileValues[key] = value
  })
} catch {
  // Les validations explicites ci-dessous produisent l'erreur utile.
}

let developmentFileUrl: string | undefined
try {
  const developmentEnv = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
  for (const line of developmentEnv.split(/\r?\n/)) {
    const match = line.trim().match(/^DATABASE_URL=(.*)$/)
    if (match) developmentFileUrl = match[1].trim().replace(/^(['"])(.*)\1$/, "$2")
  }
} catch {
  // Le fichier local est optionnel lorsque l'environnement fournit la valeur.
}

const developmentUrl = isTestDatabase
  ? developmentFileUrl
  : process.env.DATABASE_URL ?? developmentFileUrl
const testUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL_TEST ??
  fileValues.TEST_DATABASE_URL ??
  fileValues.DATABASE_URL_TEST
const databaseUrl = isTestDatabase
  ? testUrl
  : developmentUrl ?? fileValues.DATABASE_URL

if (!databaseUrl) {
  throw new Error(
    isTestDatabase
      ? "TEST_DATABASE_URL manquante : refus de retomber sur DATABASE_URL"
      : "DATABASE_URL manquante",
  )
}
if (isTestDatabase && developmentUrl && databaseUrl === developmentUrl) {
  throw new Error("La base de test doit être distincte de la base de développement")
}

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle/migrations",
  connectionString: databaseUrl,
} satisfies Config
