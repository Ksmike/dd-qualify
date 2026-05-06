import { atom } from "jotai";
import type { Theme } from "@/lib/storage";

// Initialised to "light"; ThemeProvider hydrates from localStorage on mount.
export const themeAtom = atom<Theme>("light");
