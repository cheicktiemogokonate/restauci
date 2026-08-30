import "server-only";

const DEFAULT_PUSH_HOSTS = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "push.services.mozilla.com",
  "web.push.apple.com",
] as const;

const DEFAULT_PUSH_HOST_SUFFIXES = [".notify.windows.com"] as const;

function configuredPushHosts(): Set<string> {
  return new Set(
    (process.env.WEB_PUSH_ALLOWED_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase().replace(/\.$/, ""))
      .filter(Boolean),
  );
}

export function isAllowedWebPushEndpoint(value: string): boolean {
  if (value.length > 2_048) return false;

  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    return false;
  }

  if (
    endpoint.protocol !== "https:" ||
    (endpoint.port !== "" && endpoint.port !== "443") ||
    endpoint.username !== "" ||
    endpoint.password !== "" ||
    endpoint.hash !== ""
  ) {
    return false;
  }

  const hostname = endpoint.hostname.toLowerCase().replace(/\.$/, "");
  const exactHosts = new Set<string>([
    ...DEFAULT_PUSH_HOSTS,
    ...configuredPushHosts(),
  ]);

  return (
    exactHosts.has(hostname) ||
    DEFAULT_PUSH_HOST_SUFFIXES.some(
      (suffix) => hostname.endsWith(suffix) && hostname.length > suffix.length,
    )
  );
}

export function isValidWebPushKey(
  value: string,
  expectedByteLength: number,
): boolean {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(value) || value.length > 256) {
    return false;
  }

  try {
    return Buffer.from(value, "base64url").byteLength === expectedByteLength;
  } catch {
    return false;
  }
}
