import { Sandbox } from "@vercel/sandbox";

const SETUP_TIMEOUT_MS = 10 * 60 * 1_000;

async function runChecked(sandbox, command) {
  const result = await sandbox.runCommand(command);
  if (result.exitCode === 0) return result;

  const diagnostic = (await result.stderr()).trim().split("\n")[0];
  throw new Error(
    `${command.cmd} a échoué (code ${result.exitCode})${diagnostic ? ` : ${diagnostic}` : ""}`,
  );
}

let sandbox;
let snapshotted = false;

try {
  sandbox = await Sandbox.create({
    image: "vercel/sandbox/universal:latest",
    timeout: SETUP_TIMEOUT_MS,
    resources: { vcpus: 2 },
    persistent: false,
    networkPolicy: "allow-all",
    tags: { purpose: "kyc-clamav-snapshot" },
  });

  await runChecked(sandbox, {
    cmd: "apt-get",
    args: ["update"],
    env: { DEBIAN_FRONTEND: "noninteractive" },
    sudo: true,
    timeoutMs: 3 * 60 * 1_000,
  });
  await runChecked(sandbox, {
    cmd: "apt-get",
    args: ["install", "-y", "--no-install-recommends", "clamav", "clamav-freshclam"],
    env: { DEBIAN_FRONTEND: "noninteractive" },
    sudo: true,
    timeoutMs: 4 * 60 * 1_000,
  });
  await runChecked(sandbox, {
    cmd: "freshclam",
    args: ["--stdout"],
    sudo: true,
    timeoutMs: 3 * 60 * 1_000,
  });
  await runChecked(sandbox, {
    cmd: "apt-get",
    args: ["clean"],
    sudo: true,
    timeoutMs: 30_000,
  });

  const version = await runChecked(sandbox, {
    cmd: "clamscan",
    args: ["--version"],
    timeoutMs: 15_000,
  });
  const snapshot = await sandbox.snapshot({ expiration: 0 });
  snapshotted = true;

  process.stdout.write(
    [
      `Snapshot ClamAV créé avec ${(await version.stdout()).trim()}.`,
      `KYC_CLAMAV_SANDBOX_SNAPSHOT_ID=${snapshot.snapshotId}`,
      "Ajoutez cette valeur aux environnements Vercel, puis définissez KYC_SCAN_BACKEND=vercel_sandbox.",
    ].join("\n") + "\n",
  );
} finally {
  if (sandbox && !snapshotted) {
    await sandbox.stop().catch(() => undefined);
  }
}
