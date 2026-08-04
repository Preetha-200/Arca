/**
 * SearchDropdown.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the dropdown panel when the search bar is focused.
 *
 * Idle state  (query is empty):
 *   • Recent Searches
 *   • Trending Searches
 *   • Categories
 *   • Recommended Products
 *
 * Active state (user is typing):
 *   • Category suggestions
 *   • Ranked product results
 *   • "No results" fallback
 */

import { TRENDING, CATEGORIES } from "../../hooks/useSearch";

/* ────────────────────────────────────────────────────────────────── */
/*  Helper: section header                                            */
/* ────────────────────────────────────────────────────────────────── */
const SectionTitle = ({ title, action, onAction }) => (
  <div className="sd-section-title">
    <span>{title}</span>
    {action && (
      <button className="sd-clear-btn" onClick={onAction}>
        {action}
      </button>
    )}
  </div>
);

/* ────────────────────────────────────────────────────────────────── */
/*  History item                                                      */
/* ────────────────────────────────────────────────────────────────── */
const HistoryItem = ({ text, onSelect, onRemove, focused }) => (
  <div
    className={`sd-row sd-history-item ${focused ? "sd-focused" : ""}`}
    onMouseDown={() => onSelect(text)}
  >
    <span className="sd-icon sd-icon-history">↺</span>
    <span className="sd-row-text">{text}</span>
    <button
      className="sd-remove-btn"
      onMouseDown={(e) => { e.stopPropagation(); onRemove(text); }}
      title="Remove"
    >
      ×
    </button>
  </div>
);

/* ────────────────────────────────────────────────────────────────── */
/*  Trending item                                                     */
/* ────────────────────────────────────────────────────────────────── */
const TrendingItem = ({ text, onSelect, focused }) => (
  <div
    className={`sd-row sd-trending-item ${focused ? "sd-focused" : ""}`}
    onMouseDown={() => onSelect(text)}
  >
    <span className="sd-icon sd-icon-trending">↑</span>
    <span className="sd-row-text">{text}</span>
  </div>
);

/* ────────────────────────────────────────────────────────────────── */
/*  Category chip                                                     */
/* ────────────────────────────────────────────────────────────────── */
const CategoryChip = ({ label, onClick, focused }) => (
  <button
    className={`sd-category-chip ${focused ? "sd-focused" : ""}`}
    onMouseDown={onClick}
  >
    {label}
  </button>
);

/* ────────────────────────────────────────────────────────────────── */
/*  Product result row                                               */
/* ────────────────────────────────────────────────────────────────── */
const ProductRow = ({ product, onSelect, focused }) => (
  <div
    className={`sd-row sd-product-row ${focused ? "sd-focused" : ""}`}
    onMouseDown={() => onSelect(product)}
  >
    <div className="sd-product-thumb">
      <img src={product.image} alt={product.title} />
    </div>
    <div className="sd-product-info">
      <span className="sd-product-name">{product.title}</span>
      <span className="sd-product-meta">{product.roomType}</span>
    </div>
    <span className="sd-product-price">
      ₹{product.price.toLocaleString("en-IN")}
    </span>
  </div>
);

/* ════════════════════════════════════════════════════════════════════
   Main SearchDropdown
   ════════════════════════════════════════════════════════════════════ */
const SearchDropdown = ({
  query,
  debQuery,
  results,
  categorySuggestions,
  recommended,
  searches,
  onSelectHistory,
  onSelectProduct,
  onSelectCategory,
  onRemoveSearch,
  onClearAll,
  focusedIndex,
  keyboardItems,
}) => {
  const isActive = debQuery.trim().length > 0;

  /* ── Build a lookup: which flat index maps to which sub-item ── */
  const isFocused = (idx) => focusedIndex === idx;

  /* ─── ACTIVE MODE: search is in progress ─── */
  if (isActive) {
    const hasAnything = results.length > 0 || categorySuggestions.length > 0;
    let idx = 0; // running keyboard index

    return (
      <div className="sd-panel sd-panel-active" role="listbox">
        {!hasAnything ? (
          <div className="sd-empty">
            <span>🔍</span>
            <p>No results for <strong>"{debQuery}"</strong></p>
            <span className="sd-empty-hint">
              Try searching for a room, material or style
            </span>
          </div>
        ) : (
          <>
            {/* Category suggestions */}
            {categorySuggestions.length > 0 && (
              <div className="sd-section">
                <SectionTitle title="Categories" />
                <div className="sd-category-chips">
                  {categorySuggestions.map((cat) => {
                    const i = idx++;
                    return (
                      <CategoryChip
                        key={cat.slug}
                        label={cat.label}
                        focused={isFocused(i)}
                        onClick={() => onSelectCategory(cat)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Product results */}
            {results.length > 0 && (
              <div className="sd-section">
                <SectionTitle title={`Designs (${results.length})`} />
                {results.map((p) => {
                  const i = idx++;
                  return (
                    <ProductRow
                      key={p.id}
                      product={p}
                      focused={isFocused(i)}
                      onSelect={onSelectProduct}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  /* ─── IDLE MODE: no query typed ─── */
  let idx = 0; // running keyboard index

  return (
    <div className="sd-panel" role="listbox">
      {/* ── Recent Searches ── */}
      {searches.length > 0 && (
        <div className="sd-section">
          <SectionTitle
            title="Recent Searches"
            action="Clear All"
            onAction={onClearAll}
          />
          {searches.map((s) => {
            const i = idx++;
            return (
              <HistoryItem
                key={s}
                text={s}
                focused={isFocused(i)}
                onSelect={onSelectHistory}
                onRemove={onRemoveSearch}
              />
            );
          })}
        </div>
      )}

      {/* ── Trending ── */}
      <div className="sd-section">
        <SectionTitle title="Trending Searches" />
        <div className="sd-trending-grid">
          {TRENDING.map((t) => {
            const i = idx++;
            return (
              <TrendingItem
                key={t}
                text={t}
                focused={isFocused(i)}
                onSelect={onSelectHistory}
              />
            );
          })}
        </div>
      </div>

      {/* ── Categories ── */}
      <div className="sd-section">
        <SectionTitle title="Browse Categories" />
        <div className="sd-category-chips">
          {CATEGORIES.map((cat) => {
            const i = idx++;
            return (
              <CategoryChip
                key={cat.slug}
                label={cat.label}
                focused={isFocused(i)}
                onClick={() => onSelectCategory(cat)}
              />
            );
          })}
        </div>
      </div>

      {/* ── Recommended Products ── */}
      {recommended.length > 0 && (
        <div className="sd-section">
          <SectionTitle title="Recommended" />
          {recommended.map((p) => {
            const i = idx++;
            return (
              <ProductRow
                key={p.id}
                product={p}
                focused={isFocused(i)}
                onSelect={onSelectProduct}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchDropdown;
