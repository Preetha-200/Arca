/**
 * useSearch.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Core search hook: debounced query, ranked product results, category suggestions.
 * Data-source agnostic — pass any `dataSource` array (defaults to local products).
 * Swap `products` for a Firestore snapshot in the future without touching any UI.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { products } from "../data/products";
import { rankProducts, scoreCategory } from "../utils/searchRanking";

const DEBOUNCE_MS = 300;

export const CATEGORIES = [
  { slug: "living-room", label: "Living Room"  },
  { slug: "bedroom",     label: "Bedroom"      },
  { slug: "kitchen",     label: "Kitchen"      },
  { slug: "bathroom",    label: "Bathroom"     },
  { slug: "dining-room", label: "Dining Room"  },
  { slug: "home-office", label: "Home Office"  },
];

export const TRENDING = [
  "Living Room",
  "Luxury Bedroom",
  "Minimal Kitchen",
  "Wardrobe",
  "TV Unit",
  "Dining Table",
  "Modern Office",
  "Sofa Set",
];

/* ── Hook ── */
export const useSearch = (dataSource = products) => {
  const [query,    setQuery]    = useState("");
  const [debQuery, setDebQuery] = useState("");
  const [isOpen,   setIsOpen]   = useState(false);

  /* Debounce */
  useEffect(() => {
    const t = setTimeout(() => setDebQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  /* Ranked product results (memoised) */
  const results = useMemo(
    () => rankProducts(dataSource, debQuery, 8),
    [dataSource, debQuery]
  );

  /* Category suggestions (memoised) */
  const categorySuggestions = useMemo(() => {
    if (!debQuery.trim()) return [];
    return CATEGORIES.filter((c) => scoreCategory(c.label, debQuery) > 0).sort(
      (a, b) => scoreCategory(b.label, debQuery) - scoreCategory(a.label, debQuery)
    );
  }, [debQuery]);

  /* Recommended (shown in idle dropdown — first 6 popular products) */
  const recommended = useMemo(
    () => dataSource.filter((p) => p.popular).slice(0, 6),
    [dataSource]
  );

  const open  = useCallback(() => setIsOpen(true),  []);
  const close = useCallback(() => setIsOpen(false), []);
  const clear = useCallback(() => { setQuery(""); setDebQuery(""); }, []);

  return {
    query,
    setQuery,
    debQuery,
    results,
    categorySuggestions,
    recommended,
    isOpen,
    open,
    close,
    clear,
  };
};
