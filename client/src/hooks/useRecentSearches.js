/**
 * useRecentSearches.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages per-user search history.
 *   - Guest users  → localStorage key `arca_recent_searches`
 *   - Logged-in    → merged into Firestore users/{uid}.recentSearches
 *                    AND synced to localStorage as a fast local cache
 */

import { useState, useCallback, useEffect } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const STORAGE_KEY = "arca_recent_searches";
const MAX_HISTORY = 8;

/* ── localStorage helpers ── */
const readLocal = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeLocal = (arr) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch { /* quota exceeded — silently ignore */ }
};

/* ── Hook ── */
export const useRecentSearches = (user) => {
  const [searches, setSearches] = useState(readLocal);

  /* Load Firestore history when user logs in */
  useEffect(() => {
    if (!user) {
      // Revert to localStorage on logout
      setSearches(readLocal());
      return;
    }
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && Array.isArray(snap.data().recentSearches)) {
          const remote = snap.data().recentSearches;
          setSearches(remote);
          writeLocal(remote);
        }
      } catch (err) {
        console.warn("[SearchHistory] Firestore read failed:", err.code);
      }
    })();
  }, [user]);

  /* ── Persist helper ── */
  const persist = useCallback(
    async (updated) => {
      setSearches(updated);
      writeLocal(updated);
      if (user) {
        try {
          await setDoc(
            doc(db, "users", user.uid),
            { recentSearches: updated },
            { merge: true }
          );
        } catch (err) {
          console.warn("[SearchHistory] Firestore write failed:", err.code);
        }
      }
    },
    [user]
  );

  /* ── Add (deduplicates, enforces MAX_HISTORY) ── */
  const addSearch = useCallback(
    async (query) => {
      const q = (query || "").trim();
      if (!q) return;
      const deduped = [q, ...searches.filter((s) => s !== q)].slice(0, MAX_HISTORY);
      await persist(deduped);
    },
    [searches, persist]
  );

  /* ── Remove single entry ── */
  const removeSearch = useCallback(
    async (query) => {
      await persist(searches.filter((s) => s !== query));
    },
    [searches, persist]
  );

  /* ── Clear all ── */
  const clearAll = useCallback(async () => {
    await persist([]);
  }, [persist]);

  return { searches, addSearch, removeSearch, clearAll };
};
