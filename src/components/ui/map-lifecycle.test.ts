import { describe, expect, it } from "vitest";
import { createInstanceLifecycleGuard } from "./map-lifecycle";

describe("createInstanceLifecycleGuard", () => {
  it("marks the current instance dead before child cleanups run", () => {
    const guard = createInstanceLifecycleGuard<object>();
    const map = {};

    guard.attach(map);
    expect(guard.isAlive(map)).toBe(true);

    guard.detach(map);
    expect(guard.isAlive(map)).toBe(false);
  });

  it("does not let a stale cleanup detach a replacement instance", () => {
    const guard = createInstanceLifecycleGuard<object>();
    const previousMap = {};
    const currentMap = {};

    guard.attach(previousMap);
    guard.attach(currentMap);
    guard.detach(previousMap);

    expect(guard.isAlive(previousMap)).toBe(false);
    expect(guard.isAlive(currentMap)).toBe(true);
  });
});
