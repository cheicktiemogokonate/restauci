import { afterEach, describe, expect, it, vi } from "vitest";
import { withDatabaseReadRetry } from "../src/lib/db/read-retry";

afterEach(() => {
  vi.useRealTimers();
});

describe("withDatabaseReadRetry", () => {
  it("retente deux fois une lecture après des erreurs réseau transitoires", async () => {
    vi.useFakeTimers();
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockRejectedValueOnce(new Error("Client network socket disconnected"))
      .mockResolvedValue("ok");

    const resultPromise = withDatabaseReadRetry(operation);
    await vi.advanceTimersByTimeAsync(750);

    await expect(resultPromise).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("ne retente pas une erreur SQL non transitoire", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error("syntax error"));

    await expect(withDatabaseReadRetry(operation)).rejects.toThrow(
      "syntax error",
    );
    expect(operation).toHaveBeenCalledOnce();
  });
});
