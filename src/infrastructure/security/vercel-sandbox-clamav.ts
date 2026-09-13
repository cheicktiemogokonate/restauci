import "server-only";

import { Sandbox } from "@vercel/sandbox";
import { env } from "@/infrastructure/env";
import { parseClamAvResult } from "./clamav-result";
import type { MalwareScanner, MalwareScanResult } from "./malware-scanner";

const SANDBOX_TIMEOUT_MS = 3 * 60 * 1_000;
const COMMAND_TIMEOUT_MS = 2 * 60 * 1_000;

function extensionFor(
  contentType: "image/jpeg" | "image/png" | "application/pdf",
) {
  if (contentType === "application/pdf") return "pdf";
  return contentType === "image/png" ? "png" : "jpg";
}

export class VercelSandboxClamAvScanner implements MalwareScanner {
  async scan(input: {
    body: Uint8Array;
    contentType: "image/jpeg" | "image/png" | "application/pdf";
  }): Promise<MalwareScanResult> {
    const snapshotId = env.KYC_CLAMAV_SANDBOX_SNAPSHOT_ID;
    if (!snapshotId) {
      throw new Error("KYC_CLAMAV_SANDBOX_SNAPSHOT_ID_NOT_CONFIGURED");
    }

    const sandbox = await Sandbox.create({
      source: { type: "snapshot", snapshotId },
      timeout: SANDBOX_TIMEOUT_MS,
      resources: { vcpus: 1 },
      persistent: false,
      // La mise à jour des signatures se fait avant l'arrivée du document.
      networkPolicy: { allow: ["*.clamav.net"] },
      tags: { purpose: "kyc-clamav" },
    });

    try {
      const signatures = await sandbox.runCommand({
        cmd: "freshclam",
        args: ["--stdout"],
        sudo: true,
        timeoutMs: COMMAND_TIMEOUT_MS,
      });
      if (signatures.exitCode !== 0) {
        // Le snapshot contient déjà une base de signatures valide. Une mise à
        // jour ponctuellement indisponible ne doit pas bloquer tout le service.
        console.warn("[identity] mise à jour ClamAV indisponible dans Sandbox", {
          exitCode: signatures.exitCode,
        });
      }

      // Le fichier potentiellement hostile n'est écrit qu'une fois tout accès
      // réseau coupé, ce qui empêche toute exfiltration pendant l'analyse.
      await sandbox.update({ networkPolicy: "deny-all" });
      const documentPath = `/vercel/sandbox/document.${extensionFor(input.contentType)}`;
      await sandbox.writeFiles([{ path: documentPath, content: input.body }]);

      const version = await sandbox.runCommand({
        cmd: "clamscan",
        args: ["--version"],
        timeoutMs: 15_000,
      });
      const scan = await sandbox.runCommand({
        cmd: "clamscan",
        args: ["--no-summary", "--infected", documentPath],
        timeoutMs: COMMAND_TIMEOUT_MS,
      });

      return parseClamAvResult({
        exitCode: scan.exitCode,
        stdout: await scan.stdout(),
        stderr: await scan.stderr(),
        versionOutput: await version.stdout(),
      });
    } finally {
      await sandbox.stop().catch((error) => {
        console.error("[identity] arrêt du Sandbox ClamAV impossible", { error });
      });
    }
  }
}
