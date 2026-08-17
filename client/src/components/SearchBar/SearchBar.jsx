/**
 * SearchBar.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The primary search component rendered in the Navbar.
 *
 * Desktop  → full search bar + animated dropdown
 * Mobile   → compact search icon → opens SearchOverlay fullscreen
 *
 * Integrates:
 *   useSearch          — debounced query + ranked results
 *   useRecentSearches  — history (localStorage / Firestore)
 *   SearchDropdown     — idle + active dropdown panel
 *   SearchOverlay      — mobile fullscreen experience
 */

import "./SearchBar.css";
import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSearch, CATEGORIES, TRENDING } from "../../hooks/useSearch";
import { useRecentSearches } from "../../hooks/useRecentSearches";
import SearchDropdown from "./SearchDropdown";
import SearchOverlay from "./SearchOverlay";

/* ════════════════════════════════════════════════════════════════════
   SearchBar
   ════════════════════════════════════════════════════════════════════ */
const SearchBar = ({ user }) => {
  const navigate   = useNavigate();
  const inputRef   = useRef(null);
  const wrapperRef = useRef(null);

  /* ── State ── */
  const [focusedIndex,    setFocusedIndex]    = useState(-1);
  const [mobileOverlay,   setMobileOverlay]   = useState(false);

  /* ── Hooks ── */
  const {
    query, setQuery, debQuery,
    results, categorySuggestions, recommended,
    isOpen, open, close, clear,
  } = useSearch();

  const {
    searches, addSearch, removeSearch, clearAll,
  } = useRecentSearches(user);

  /* ── Close on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (!wrapperRef.current?.contains(e.target)) {
        close();
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [close]);

  /* ──────────────────────────────────────────────────────────────────
     Build flat keyboard-navigation list for the currently visible panel
     ────────────────────────────────────────────────────────────────── */
  const keyboardItems = useMemo(() => {
    const isActive = debQuery.trim().length > 0;
    if (isActive) {
      return [
        ...categorySuggestions.map((c) => ({ type: "category", ...c })),
        ...results.map((p)             => ({ type: "product",  ...p  })),
      ];
    }
    return [
      ...searches.map((s)          => ({ type: "history",  value: s  })),
      ...TRENDING.map((t)          => ({ type: "trending", value: t  })),
      ...CATEGORIES.map((c)        => ({ type: "category", ...c      })),
      ...recommended.map((p)       => ({ type: "product",  ...p      })),
    ];
  }, [debQuery, categorySuggestions, results, searches, recommended]);

  /* ──────────────────────────────────────────────────────────────────
     Navigate to the selected item
     ────────────────────────────────────────────────────────────────── */
  const handleSelect = useCallback(
    (item) => {
      if (!item) return;

      switch (item.type) {
        case "product":
          addSearch(query || item.title);
          close();
          clear();
          navigate(`/product/${item.id}`);
          break;

        case "category":
          addSearch(item.label);
          close();
          clear();
          navigate(`/products/${item.slug}`);
          break;

        case "history":
        case "trending":
          setQuery(item.value);
          addSearch(item.value);
          open();
          setFocusedIndex(-1);
          break;

        default:
          break;
      }
    },
    [query, addSearch, close, clear, navigate, setQuery, open]
  );

  /* ──────────────────────────────────────────────────────────────────
     Keyboard handler
     ────────────────────────────────────────────────────────────────── */
  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((i) => Math.min(i + 1, keyboardItems.length - 1));
          break;

        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((i) => Math.max(i - 1, -1));
          break;

        case "Enter": {
          e.preventDefault();
          if (focusedIndex >= 0 && keyboardItems[focusedIndex]) {
            handleSelect(keyboardItems[focusedIndex]);
          } else if (query.trim()) {
            addSearch(query);
            // If there's a single exact category, navigate there
            if (categorySuggestions.length === 1) {
              handleSelect({ type: "category", ...categorySuggestions[0] });
            } else if (results.length > 0) {
              handleSelect({ type: "product", ...results[0] });
            }
          }
          break;
        }

        case "Escape":
          close();
          setFocusedIndex(-1);
          inputRef.current?.blur();
          break;

        case "Tab":
          close();
          setFocusedIndex(-1);
          break;

        default:
          break;
      }
    },
    [isOpen, focusedIndex, keyboardItems, query, handleSelect, addSearch,
     categorySuggestions, results, close]
  );

  /* ── Reset focus index when query changes ── */
  useEffect(() => { setFocusedIndex(-1); }, [query]);

  /* ════════════════════════════════════════════════════════════════
     Render
     ════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ─────────────────────────────────────────────────────────
          DESKTOP SEARCH BAR (hidden on mobile via CSS)
          ───────────────────────────────────────────────────────── */}
      <div
        ref={wrapperRef}
        className={`searchbar-wrapper ${isOpen ? "searchbar-open" : ""}`}
      >
        {/* Mobile Input Mask */}
        <div 
          className="searchbar-mobile-mask" 
          onClick={() => setMobileOverlay(true)}
        ></div>

        {/* Input row */}
        <div className={`searchbar-input-row ${isOpen ? "searchbar-input-focused" : ""}`}>
          <span className="searchbar-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>

          <input
            ref={inputRef}
            id="arca-search-input"
            type="text"
            className="searchbar-input"
            placeholder="Search designs, rooms, materials..."
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setFocusedIndex(-1); }}
            onFocus={() => {
              if (window.innerWidth >= 768) {
                open();
              }
            }}
            onKeyDown={handleKeyDown}
            aria-label="Search designs"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-autocomplete="list"
          />

          {query && (
            <button
              className="searchbar-clear-btn"
              onClick={() => { clear(); inputRef.current?.focus(); }}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Dropdown */}
        {isOpen && window.innerWidth >= 768 && (
          <SearchDropdown
            query={query}
            debQuery={debQuery}
            results={results}
            categorySuggestions={categorySuggestions}
            recommended={recommended}
            searches={searches}
            onSelectHistory={(text) => handleSelect({ type: "history", value: text })}
            onSelectProduct={(p)   => handleSelect({ type: "product",  ...p        })}
            onSelectCategory={(c)  => handleSelect({ type: "category", ...c        })}
            onRemoveSearch={removeSearch}
            onClearAll={clearAll}
            focusedIndex={focusedIndex}
            keyboardItems={keyboardItems}
          />
        )}
      </div>

      {/* Mobile Overlay */}
      {mobileOverlay && (
        <SearchOverlay
          user={user}
          onClose={() => setMobileOverlay(false)}
        />
      )}

    </>
  );
};

export default SearchBar;
