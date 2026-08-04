/**
 * searchRanking.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable relevance-scoring utility for ARCA product search.
 *
 * Priority tiers (higher = more relevant):
 *   100  Exact title match
 *    80  Title starts-with
 *    60  Title contains
 *    50  Category exact
 *    45  RoomType exact / contains
 *    40  Category starts-with
 *    35  Material exact
 *    30  Category contains
 *    25  Material starts-with / RoomType partial
 *    15  Material contains
 *    10  Description contains
 *
 * This file is data-source-agnostic: pass any array of product objects.
 * Replace `import { products }` with a Firestore fetch in the future
 * without touching this file.
 */

/* ── Single product score against a query ── */
export const scoreProduct = (product, rawQuery) => {
  if (!rawQuery?.trim()) return 0;

  const q        = rawQuery.toLowerCase().trim();
  const title    = (product.title    || "").toLowerCase();
  const category = (product.category || "").replace(/-/g, " ").toLowerCase();
  const roomType = (product.roomType  || "").toLowerCase();
  const material = (product.material  || "").toLowerCase();
  const desc     = (product.description || "").toLowerCase();

  let score = 0;

  /* 1. Exact title */
  if (title === q) return 100;

  /* 2. Title starts-with */
  if (title.startsWith(q)) score += 80;
  /* 3. Title contains (word boundary preferred) */
  else if (title.includes(q)) score += 60;

  /* 4. Category exact */
  if (category === q) score += 50;
  /* 5. Room type exact or contains */
  if (roomType === q) score += 45;
  else if (roomType.includes(q)) score += 25;

  /* 6. Category starts-with */
  if (category.startsWith(q)) score += 40;
  /* 7. Material exact */
  if (material === q) score += 35;
  /* 8. Category contains */
  if (!category.startsWith(q) && category.includes(q)) score += 30;
  /* 9. Material starts-with */
  if (material.startsWith(q)) score += 25;
  /* 10. Material contains */
  else if (material.includes(q)) score += 15;

  /* 11. Description */
  if (desc.includes(q)) score += 10;

  return score;
};

/**
 * Returns products sorted by relevance, filtering out score === 0.
 * @param {Array}  products  - Array of product objects
 * @param {string} query     - Raw search string
 * @param {number} limit     - Max results (default unlimited)
 */
export const rankProducts = (products, query, limit = Infinity) => {
  if (!query?.trim()) return [];
  return products
    .map((p) => ({ product: p, score: scoreProduct(p, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ product }) => product);
};

/**
 * Score a category string against a query.
 * Used to surface category suggestions in the dropdown.
 */
export const scoreCategory = (categoryLabel, rawQuery) => {
  if (!rawQuery?.trim()) return 0;
  const q   = rawQuery.toLowerCase().trim();
  const cat = categoryLabel.toLowerCase();
  if (cat === q) return 100;
  if (cat.startsWith(q)) return 80;
  if (cat.includes(q)) return 50;
  return 0;
};
