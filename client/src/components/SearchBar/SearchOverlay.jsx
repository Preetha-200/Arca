/**
 * SearchOverlay.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen search overlay for mobile (< 768px).
 * Mimics Amazon / Flipkart mobile search UX.
 */

import { useRef, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSearch, TRENDING, CATEGORIES } from "../../hooks/useSearch";
import { useRecentSearches } from "../../hooks/useRecentSearches";

const SearchOverlay = ({ user, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const {
    query, setQuery, debQuery, results, categorySuggestions,
    recommended, clear,
  } = useSearch();

  const { searches, addSearch, removeSearch, clearAll } = useRecentSearches(user);

  /* Auto-focus on mount */
  useEffect(() => {
    inputRef.current?.focus();
    // Prevent body scroll while overlay is open
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const isActive = debQuery.trim().length > 0;

  /* ── Handlers ── */
  const goProduct  = (p)   => { addSearch(query || p.title); onClose(); navigate(`/product/${p.id}`); };
  const goCategory = (cat) => { addSearch(cat.label);         onClose(); navigate(`/products/${cat.slug}`); };
  const goQuery    = (q)   => { setQuery(q); addSearch(q); };

  const handleEnter = (e) => {
    if (e.key !== "Enter" || !query.trim()) return;
    addSearch(query);
    if (results.length > 0) { goProduct(results[0]); }
    else if (categorySuggestions.length > 0) { goCategory(categorySuggestions[0]); }
  };

  return (
    <div className="so-overlay">
      {/* ── Top bar ── */}
      <div className="so-topbar">
        <div className="so-input-wrap">
          <span className="so-icon">⌕</span>
          <input
            ref={inputRef}
            className="so-input"
            type="text"
            placeholder="Search designs, rooms, materials..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleEnter}
          />
          {query && (
            <button className="so-clear" onClick={() => { clear(); inputRef.current?.focus(); }}>
              ×
            </button>
          )}
        </div>
        <button className="so-cancel" onClick={onClose}>Cancel</button>
      </div>

      {/* ── Content ── */}
      <div className="so-body">
        {isActive ? (
          /* ── Active: show results ── */
          <>
            {results.length === 0 && categorySuggestions.length === 0 ? (
              <div className="so-empty">
                <span>🔍</span>
                <p>No results for <strong>"{debQuery}"</strong></p>
              </div>
            ) : (
              <>
                {categorySuggestions.length > 0 && (
                  <div className="so-section">
                    <p className="so-section-title">Categories</p>
                    <div className="so-chips">
                      {categorySuggestions.map((cat) => (
                        <button
                          key={cat.slug}
                          className="so-chip"
                          onMouseDown={() => goCategory(cat)}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {results.length > 0 && (
                  <div className="so-section">
                    <p className="so-section-title">Designs</p>
                    {results.map((p) => (
                      <div
                        key={p.id}
                        className="so-product-row"
                        onMouseDown={() => goProduct(p)}
                      >
                        <img src={p.image} alt={p.title} />
                        <div className="so-product-info">
                          <span>{p.title}</span>
                          <small>{p.roomType}</small>
                        </div>
                        <span className="so-product-price">
                          ₹{p.price.toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          /* ── Idle: show history + trending + categories ── */
          <>
            {searches.length > 0 && (
              <div className="so-section">
                <div className="so-section-head">
                  <p className="so-section-title">Recent</p>
                  <button className="so-clear-all" onClick={clearAll}>Clear All</button>
                </div>
                {searches.map((s) => (
                  <div key={s} className="so-history-row" onMouseDown={() => goQuery(s)}>
                    <span className="so-hist-icon">↺</span>
                    <span>{s}</span>
                    <button
                      className="so-remove"
                      onMouseDown={(e) => { e.stopPropagation(); removeSearch(s); }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="so-section">
              <p className="so-section-title">Trending</p>
              <div className="so-chips">
                {TRENDING.map((t) => (
                  <button
                    key={t}
                    className="so-chip so-chip-trending"
                    onMouseDown={() => goQuery(t)}
                  >
                    ↑ {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="so-section">
              <p className="so-section-title">Browse Categories</p>
              <div className="so-chips">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.slug}
                    className="so-chip"
                    onMouseDown={() => goCategory(cat)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SearchOverlay;
