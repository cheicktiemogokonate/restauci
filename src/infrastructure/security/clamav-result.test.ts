import { describe, expect, it } from "vitest";
import { ClamAvExecutionError, parseClamAvResult } from "./clamav-result";

describe("parseClamAvResult", () => {
  it("returns a clean result for ClamAV exit code 0", () => {
    expect(
      parseClamAvResult({
        exitCode: 0,
        stdout: "",
        stderr: "",
        versionOutput: "ClamAV 1.4.3/27500/Thu Sep 3 2026",
      }),
    ).toEqual({
      status: "clean",
      engine: "ClamAV 1.4.3/27500/Thu Sep 3 2026",
      result: "clean",
    });
  });

  it("keeps only the malware signature for exit code 1", () => {
    expect(
      parseClamAvResult({
        exitCode: 1,
        stdout: "/vercel/sandbox/document.pdf: Win.Test.EICAR_HDB-1 FOUND\n",
        stderr: "",
        versionOutput: "ClamAV 1.4.3",
      }),
    ).toEqual({
      status: "infected",
      engine: "ClamAV 1.4.3",
      result: "malware:Win.Test.EICAR_HDB-1",
    });
  });

  it("fails closed when ClamAV cannot scan the file", () => {
    expect(() =>
      parseClamAvResult({
        exitCode: 2,
        stdout: "",
        stderr: "LibClamAV Error: scan failed",
        versionOutput: "ClamAV 1.4.3",
      }),
    ).toThrow(ClamAvExecutionError);
  });
});
