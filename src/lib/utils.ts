import type { BasicUser } from "../types";

export const pad2 = (n: number) => String(n).padStart(2, "0");

export const stamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(
    d.getDate()
  )}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
};

export const toKey = (u: BasicUser) => u.username.toLowerCase();

export const alphaHeader = (username: string) =>
  username?.[0]?.toUpperCase() ?? "#";

// Merge a → b shallowly but preserve truthy values in b (b wins)
export const mergeUser = (a: BasicUser, b: BasicUser): BasicUser => {
  const aliases = new Set<string>([...(a.aliases ?? []), ...(b.aliases ?? [])]);
  if (a.username !== b.username) {
    aliases.add(a.username);
    aliases.add(b.username);
  }
  return {
    ...a,
    ...b,
    aliases: Array.from(aliases),
    // Don't inherit whitelisted status from base if snapshot doesn't have it
    // whitelisted: b.whitelisted ?? a.whitelisted,
    first_seen: a.first_seen ?? b.first_seen,
    last_seen: b.last_seen ?? a.last_seen,
  };
};

// Simple in-memory paginate
export const paginate = <T>(arr: T[], page: number, pageSize: number) => {
  const start = (page - 1) * pageSize;
  return arr.slice(start, start + pageSize);
};

// Quick & safe number
export const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
