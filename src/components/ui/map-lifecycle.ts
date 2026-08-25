export function createInstanceLifecycleGuard<T extends object>() {
  let current: T | null = null;

  return {
    attach(instance: T) {
      current = instance;
    },
    detach(instance: T) {
      if (current === instance) current = null;
    },
    isAlive(instance: T) {
      return current === instance;
    },
  };
}
