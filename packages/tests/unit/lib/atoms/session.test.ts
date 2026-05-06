import { describe, it, expect } from "vitest";
import { createStore } from "jotai";
import { sessionUserAtom, sessionLoadingAtom } from "@/lib/atoms/session";

describe("session atoms", () => {
  it("sessionUserAtom defaults to null", () => {
    const store = createStore();
    expect(store.get(sessionUserAtom)).toBeNull();
  });

  it("sessionLoadingAtom defaults to true", () => {
    const store = createStore();
    expect(store.get(sessionLoadingAtom)).toBe(true);
  });

  it("sessionUserAtom can be set to a user", () => {
    const store = createStore();
    const user = { id: "1", name: "Test", email: "t@t.com", image: null };
    store.set(sessionUserAtom, user);
    expect(store.get(sessionUserAtom)).toEqual(user);
  });

  it("sessionLoadingAtom can be set to false", () => {
    const store = createStore();
    store.set(sessionLoadingAtom, false);
    expect(store.get(sessionLoadingAtom)).toBe(false);
  });
});
