import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearClientMemoryCache,
  readClientMemoryCache,
  writeClientMemoryCache,
} from "../src/lib/client-app/client-memory-cache";

describe("cache mémoire du parcours client", () => {
  afterEach(() => {
    clearClientMemoryCache();
    vi.useRealTimers();
  });

  it("retourne immédiatement une donnée récemment visitée", () => {
    writeClientMemoryCache("restaurant:maquis", { nom: "Maquis" });

    expect(readClientMemoryCache("restaurant:maquis", 30_000)).toEqual({
      data: { nom: "Maquis" },
      isFresh: true,
    });
  });

  it("garde une donnée périmée pour l'afficher pendant sa revalidation", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T12:00:00Z"));
    writeClientMemoryCache("restaurant:maquis", { nom: "Maquis" });
    vi.advanceTimersByTime(30_001);

    expect(readClientMemoryCache("restaurant:maquis", 30_000)).toEqual({
      data: { nom: "Maquis" },
      isFresh: false,
    });
  });
});
