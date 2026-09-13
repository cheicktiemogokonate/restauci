import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runCausalityMaintenance: vi.fn(),
  cleanupAbandonedPublicMediaAssets: vi.fn(),
}));

vi.mock("@/modules/events/server", () => ({
  runCausalityMaintenance: mocks.runCausalityMaintenance,
}));

vi.mock("@/modules/media/server", () => ({
  cleanupAbandonedPublicMediaAssets:
    mocks.cleanupAbandonedPublicMediaAssets,
}));

import { GET } from "./route";

const cronSecret = "hobby-cron-secret-with-at-least-32-chars";

function request(authorization = `Bearer ${cronSecret}`) {
  return new Request("http://localhost/api/cron/daily-maintenance", {
    headers: { authorization },
  });
}

describe("GET /api/cron/daily-maintenance", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", cronSecret);
    mocks.runCausalityMaintenance.mockResolvedValue({
      outbox: { claimed: 0 },
    });
    mocks.cleanupAbandonedPublicMediaAssets.mockResolvedValue({
      claimed: 0,
      deleted: 0,
      failed: 0,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("refuse un appel non autorisé", async () => {
    const response = await GET(request("Bearer incorrect"));

    expect(response.status).toBe(401);
    expect(mocks.runCausalityMaintenance).not.toHaveBeenCalled();
    expect(mocks.cleanupAbandonedPublicMediaAssets).not.toHaveBeenCalled();
  });

  it("reste indisponible sans secret exploitable", async () => {
    vi.stubEnv("CRON_SECRET", "court");

    const response = await GET(request("Bearer court"));

    expect(response.status).toBe(503);
  });

  it("exécute les deux maintenances quotidiennes", async () => {
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mocks.runCausalityMaintenance).toHaveBeenCalledWith({ limit: 100 });
    expect(mocks.cleanupAbandonedPublicMediaAssets).toHaveBeenCalledWith({
      limit: 500,
    });
  });

  it("signale un échec sans empêcher l'autre maintenance", async () => {
    mocks.runCausalityMaintenance.mockRejectedValue(new Error("causality"));

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      success: false,
      causality: { success: false },
      media: { success: true },
    });
    expect(mocks.cleanupAbandonedPublicMediaAssets).toHaveBeenCalledOnce();
  });
});
