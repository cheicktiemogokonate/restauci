import type { MalwareScanResult } from "./malware-scanner";

export class ClamAvExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClamAvExecutionError";
  }
}

function clamAvEngine(versionOutput: string) {
  const version = versionOutput.trim().split("\n")[0]?.trim();
  return (version || "ClamAV").slice(0, 100);
}

export function parseClamAvResult(input: {
  exitCode: number;
  stdout: string;
  stderr: string;
  versionOutput: string;
}): MalwareScanResult {
  const engine = clamAvEngine(input.versionOutput);

  if (input.exitCode === 0) {
    return { status: "clean", engine, result: "clean" };
  }

  if (input.exitCode === 1) {
    const finding = input.stdout.match(/:\s+([^\r\n]+?)\s+FOUND\s*$/m)?.[1];
    if (!finding) {
      throw new ClamAvExecutionError(
        "ClamAV a signalé une infection sans fournir de signature.",
      );
    }
    return {
      status: "infected",
      engine,
      result: `malware:${finding}`.slice(0, 255),
    };
  }

  const diagnostic = input.stderr.trim().split("\n")[0]?.slice(0, 300);
  throw new ClamAvExecutionError(
    diagnostic
      ? `ClamAV n’a pas pu analyser le document : ${diagnostic}`
      : `ClamAV n’a pas pu analyser le document (code ${input.exitCode}).`,
  );
}
