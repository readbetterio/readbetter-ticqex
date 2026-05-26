"use client";

import { useCallback, useState } from "react";

const STORAGE_KEY = "ticqex.tags.recent.v1";
const MAX_RECENT = 12;

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function writeRecent(names: string[]) {
  if (typeof window === "undefined") return;
  if (names.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
}

export function useRecentTags() {
  const [recentNames, setRecentNames] = useState<string[]>(readRecent);

  const touch = useCallback((names: string[]) => {
    const trimmed = names.map((n) => n.trim()).filter(Boolean);
    if (!trimmed.length) return;

    setRecentNames((prev) => {
      const next = [
        ...trimmed,
        ...prev.filter((name) => !trimmed.includes(name)),
      ].slice(0, MAX_RECENT);
      writeRecent(next);
      return next;
    });
  }, []);

  return { recentNames, touch };
}
