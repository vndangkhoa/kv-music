// Some in-app browsers (Facebook/Messenger, Instagram, embedded WebViews) run
// the page in a restricted storage context where accessing window.localStorage
// throws a SecurityError. If that happens during render/effects it crashes
// React and leaves users staring at a blank page. This wrapper degrades to an
// in-memory store instead of throwing.

const memoryStore = new Map<string, string>();

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryStore.get(key) ?? null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memoryStore.set(key, value);
    }
  },
  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      memoryStore.delete(key);
    }
  },
};
