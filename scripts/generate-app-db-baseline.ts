import * as fs from "node:fs";
import * as path from "node:path";
import { scanDirectory } from "../tests/architecture/engine";
import { findAppDbViolations } from "../tests/architecture/rules";

const approvalFlag = "--approved-baseline-update";
if (!process.argv.includes(approvalFlag)) {
  throw new Error(
    [
      "Refusing to rewrite the architecture baseline.",
      "New violations must be fixed, not allowlisted.",
      `Use ${approvalFlag} only after an explicit architecture decision.`,
    ].join("\n"),
  );
}

const violations = findAppDbViolations(
  scanDirectory(path.join(process.cwd(), "src/app")),
).sort((left, right) =>
  `${left.file}:${left.target}`.localeCompare(`${right.file}:${right.target}`),
);

fs.writeFileSync(
  path.join(
    process.cwd(),
    "tests/architecture/baselines/app-db-imports.json",
  ),
  `${JSON.stringify(violations, null, 2)}\n`,
);

console.log(`Generated baseline with ${violations.length} violations.`);
