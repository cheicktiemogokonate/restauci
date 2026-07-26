import type { Config } from "drizzle-kit"
import { readFileSync } from "fs"
import { resolve } from "path"

const isTestDatabase = process.env.TEST_DATABASE === "true"
const dotenvPath = resolve(
  process.cwd(),
  isTestDatabase ? ".env.test.local" : ".env.local",
)

if (!process.env.DATABASE_URL) {
  try {
    const env = readFileSync(dotenvPath, "utf8")
    env.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) return
      const [key, ...rest] = trimmed.split("=")
      const value = rest.join("=").trim()
      if (key && value && !process.env[key]) {
        process.env[key] = value
      }
    })
  } catch {
    // ignore if .env.local is missing
  }
}

if (isTestDatabase && process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST
}

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  strict: true,
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
