import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isAllowedWebPushEndpoint,
  isValidWebPushKey,
} from "./_internal/web-push-endpoint";

afterEach(() => vi.unstubAllEnvs());

describe("web push endpoint allowlist", () => {
  it("accepts only known HTTPS push providers", () => {
    expect(
      isAllowedWebPushEndpoint("https://fcm.googleapis.com/fcm/send/abc"),
    ).toBe(true);
    expect(
      isAllowedWebPushEndpoint(
        "https://updates.push.services.mozilla.com/wpush/v2/abc",
      ),
    ).toBe(true);
    expect(
      isAllowedWebPushEndpoint(
        "https://db5.notify.windows.com/w/?token=opaque",
      ),
    ).toBe(true);
  });

  it("rejects local targets, unsafe schemes and suffix confusion", () => {
    expect(isAllowedWebPushEndpoint("https://127.0.0.1/admin")).toBe(false);
    expect(isAllowedWebPushEndpoint("https://localhost/internal")).toBe(false);
    expect(
      isAllowedWebPushEndpoint("http://fcm.googleapis.com/fcm/send/abc"),
    ).toBe(false);
    expect(
      isAllowedWebPushEndpoint("https://fcm.googleapis.com.evil.test/abc"),
    ).toBe(false);
    expect(
      isAllowedWebPushEndpoint("https://fcm.googleapis.com:8443/abc"),
    ).toBe(false);
  });

  it("supports an explicit exact-host extension", () => {
    vi.stubEnv("WEB_PUSH_ALLOWED_HOSTS", "push.example.test");
    expect(
      isAllowedWebPushEndpoint("https://push.example.test/subscription/abc"),
    ).toBe(true);
    expect(
      isAllowedWebPushEndpoint("https://sub.push.example.test/subscription"),
    ).toBe(false);
  });
});

describe("web push key validation", () => {
  it("checks base64url encoding and decoded lengths", () => {
    expect(isValidWebPushKey(Buffer.alloc(65).toString("base64url"), 65)).toBe(
      true,
    );
    expect(isValidWebPushKey(Buffer.alloc(16).toString("base64url"), 16)).toBe(
      true,
    );
    expect(isValidWebPushKey(Buffer.alloc(15).toString("base64url"), 16)).toBe(
      false,
    );
    expect(isValidWebPushKey("***", 16)).toBe(false);
  });
});
