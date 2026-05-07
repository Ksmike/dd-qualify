import { describe, it, expect, beforeEach } from "vitest";
import { createStorageKey, themeStorage } from "@/lib/storage";

describe("createStorageKey", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("get", () => {
    it("returns null when key does not exist", () => {
      const storage = createStorageKey<string>("test:key", (v) => v);
      expect(storage.get()).toBeNull();
    });

    it("returns parsed value when key exists", () => {
      localStorage.setItem("test:key", "hello");
      const storage = createStorageKey<string>("test:key", (v) => v);
      expect(storage.get()).toBe("hello");
    });

    it("applies parse function to raw value", () => {
      localStorage.setItem("test:num", "42");
      const storage = createStorageKey<number>("test:num", (v) => parseInt(v, 10));
      expect(storage.get()).toBe(42);
    });

    it("returns null when parse throws", () => {
      localStorage.setItem("test:bad", "not-json");
      const storage = createStorageKey<object>("test:bad", (v) => JSON.parse(v));
      expect(storage.get()).toBeNull();
    });
  });

  describe("set", () => {
    it("stores value using default serializer", () => {
      const storage = createStorageKey<string>("test:key", (v) => v);
      storage.set("world");
      expect(localStorage.getItem("test:key")).toBe("world");
    });

    it("stores value using custom serializer", () => {
      const storage = createStorageKey<number>(
        "test:num",
        (v) => parseInt(v, 10),
        (v) => v.toString()
      );
      storage.set(99);
      expect(localStorage.getItem("test:num")).toBe("99");
    });
  });

  describe("remove", () => {
    it("removes the key from localStorage", () => {
      localStorage.setItem("test:key", "value");
      const storage = createStorageKey<string>("test:key", (v) => v);
      storage.remove();
      expect(localStorage.getItem("test:key")).toBeNull();
    });

    it("does nothing when key does not exist", () => {
      const storage = createStorageKey<string>("test:missing", (v) => v);
      expect(() => storage.remove()).not.toThrow();
    });
  });

  describe("SSR safety", () => {
    it("returns null from get when window is undefined", () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error - simulating SSR
      delete globalThis.window;

      const storage = createStorageKey<string>("test:key", (v) => v);
      expect(storage.get()).toBeNull();

      globalThis.window = originalWindow;
    });
  });
});

describe("themeStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no theme is stored", () => {
    expect(themeStorage.get()).toBeNull();
  });

  it("returns 'dark' when stored value is 'dark'", () => {
    localStorage.setItem("dd:theme", "dark");
    expect(themeStorage.get()).toBe("dark");
  });

  it("returns 'light' for any non-dark value", () => {
    localStorage.setItem("dd:theme", "invalid");
    expect(themeStorage.get()).toBe("light");
  });

  it("stores theme value", () => {
    themeStorage.set("dark");
    expect(localStorage.getItem("dd:theme")).toBe("dark");
  });

  it("removes theme value", () => {
    themeStorage.set("dark");
    themeStorage.remove();
    expect(localStorage.getItem("dd:theme")).toBeNull();
  });
});
