import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildOpenApiV1Spec } from "../src/app/api/_shared/openapi-v1.ts";

const outputFlagIndex = process.argv.indexOf("--output");
const configuredOutput =
  outputFlagIndex >= 0 ? process.argv[outputFlagIndex + 1] : undefined;
const outputPath = path.resolve(
  configuredOutput ?? path.join(process.cwd(), "docs/openapi-v1.json"),
);
const serverUrl =
  process.env.OPENAPI_SERVER_URL ?? "https://restauci.vercel.app";

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify(buildOpenApiV1Spec(serverUrl), null, 2)}\n`,
  "utf8",
);

console.log(`OpenAPI v1 exporté vers ${outputPath}`);
