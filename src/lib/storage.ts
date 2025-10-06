import type { LDGRJson } from "../types";

const KEY = "followldgr:last-export";

export function saveMerged(json: LDGRJson) {
  try {
    localStorage.setItem(KEY, JSON.stringify(json));
  } catch {}
}
export function loadMerged(): LDGRJson | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return undefined;
}
