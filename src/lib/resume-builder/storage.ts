import type { ResumeFormState } from "./types";

const STORAGE_KEY = "resume-builder-state";
const STORAGE_VERSION = 3;

interface StoredState {
  version: number;
  state: ResumeFormState;
}

export function saveState(state: ResumeFormState): void {
  try {
    const stored: StoredState = { version: STORAGE_VERSION, state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function loadState(): ResumeFormState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored: StoredState = JSON.parse(raw);
    if (stored.version !== STORAGE_VERSION) return null;
    return stored.state;
  } catch {
    return null;
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
