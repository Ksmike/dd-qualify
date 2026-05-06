import { atom } from "jotai";

export type SessionUser = {
  id: string;
  locale?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export const sessionUserAtom = atom<SessionUser | null>(null);
export const sessionLoadingAtom = atom<boolean>(true);
