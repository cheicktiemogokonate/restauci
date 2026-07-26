import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const envFile = readFileSync(".env.test.local", "utf8");
const values = Object.fromEntries(
  envFile.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
  }),
);

const child = spawn(process.argv[2], process.argv.slice(3), {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: values.DATABASE_URL_TEST,
    UPSTASH_REDIS_REST_URL: values.UPSTASH_REDIS_REST_URL_TEST,
    UPSTASH_REDIS_REST_TOKEN: values.UPSTASH_REDIS_REST_TOKEN_TEST,
    JWT_SECRET: values.JWT_SECRET_TEST,
    E2E_TEST: "true",
  },
});
child.on("exit", (code) => process.exit(code ?? 1));
