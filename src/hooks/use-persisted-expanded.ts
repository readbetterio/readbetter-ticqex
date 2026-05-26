"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";

function storageKey(prefix: string, userEmail: string) {
  return `${prefix}:${userEmail}`;
}

function readExpanded(
  prefix: string,
  userEmail: string,
  defaultExpanded: boolean,
): boolean {
  if (typeof window === "undefined") return defaultExpanded;
  try {
    const raw = localStorage.getItem(storageKey(prefix, userEmail));
    if (raw === null) return defaultExpanded;
    return raw === "true";
  } catch {
    return defaultExpanded;
  }
}

function writeExpanded(prefix: string, userEmail: string, expanded: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(prefix, userEmail), String(expanded));
  } catch {
    // ignore quota / private mode errors
  }
}

export function usePersistedExpanded(prefix: string, defaultExpanded: boolean) {
  const { user, loading } = useCurrentUser();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user?.email) {
      setExpanded(readExpanded(prefix, user.email, defaultExpanded));
    } else {
      setExpanded(defaultExpanded);
    }
    setHydrated(true);
  }, [loading, user?.email, prefix, defaultExpanded]);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      if (user?.email) writeExpanded(prefix, user.email, next);
      return next;
    });
  }, [prefix, user?.email]);

  return { expanded, toggleExpanded, hydrated };
}
