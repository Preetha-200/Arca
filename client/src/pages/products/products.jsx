import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast/Toast";
import { products, getMaterials } from "../../data/products";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import EmptyState from "../../components/EmptyState/EmptyState";
import "./products.css";

const CATEGORIES = [
    { value: "living-room",  label: "Living Room" },
    { value: "kitchen",      label: "Kitchen" },
    { value: "dining-room",  label: "Dining Room" },
    { value: "home-office",  label: "Home Office" },
    { value: "bedroom",      label: "Bedroom" },
    { value: "bathroom",     label: "Bathroom" },
];

const SORT_OPTIONS = [
    { value: "default",   label: "Sort" },
    { value: "latest",    label: "Latest" },
    { value: "popular",   label: "Popular" },
];

const Products = () => {
    const navigate = useNavigate();
    const { category } = useParams();
    const { user }     = useAuth();
    const { showToast, ToastContainer } = useToast();

    /* ── State ── */
    const [search,       setSearch]       = useState("");
    const [sortBy,       setSortBy]       = useState("default");
    const [filterMat,    setFilterMat]    = useState("");
    const [showFilters,  setShowFilters]  = useState(false);
    const [wishlisted,   setWishlisted]   = useState({}); // { productId: bool }

    const allMaterials = useMemo(() => getMaterials(), []);

    /* ── Derived product list ── */
    const filtered = useMemo(() => {
        let list = products.filter((p) => p.category === category);

        // Search
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                (p) =>
                    p.title.toLowerCase().includes(q) ||
                    p.material.toLowerCase().includes(q) ||
                    p.roomType.toLowerCase().includes(q)
            );
        }

        // Material
        if (filterMat) list = list.filter((p) => p.material === filterMat);

        // Sort
        switch (sortBy) {
            case "latest":     list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
            case "popular":    list = [...list].sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0)); break;
            default: break;
        }

        return list;
    }, [category, search, filterMat, sortBy]);

    /* ── Wishlist toggle ── */
    const toggleWishlist = async (e, product) => {
        e.stopPropagation();
        if (!user) { showToast("Sign in to save to your wishlist", "info"); return; }

        const ref    = doc(db, "wishlist", user.uid, "items", product.id);
        const active = wishlisted[product.id];

        setWishlisted((prev) => ({ ...prev, [product.id]: !active }));

        try {
            if (active) {
                await deleteDoc(ref);
                showToast("Removed from wishlist", "info");
            } else {
                await setDoc(ref, {
                    productId: product.id,
                    title:     product.title,
                    image:     product.image,
                    size:      product.size,
                    addedAt:   new Date().toISOString(),
                });
                showToast("Added to wishlist ♡", "success");
            }
        } catch (err) {
            console.error(err);
            setWishlisted((prev) => ({ ...prev, [product.id]: active }));
            showToast("Failed to update wishlist", "error");
        }
    };

    /* ── Load existing wishlist state on mount ── */
    useMemo(() => {
        if (!user) return;
        products
            .filter((p) => p.category === category)
            .forEach(async (p) => {
                const snap = await getDoc(doc(db, "wishlist", user.uid, "items", p.id));
                if (snap.exists()) {
                    setWishlisted((prev) => ({ ...prev, [p.id]: true }));
                }
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, category]);

    const label = CATEGORIES.find((c) => c.value === category)?.label || category;

    return (
        <div className="products-page">
            <Navbar />
            <ToastContainer />

            {/* ── Hero ── */}
            <div className="products-hero">
                <h1>{label}</h1>
            </div>

            {/* ── Toolbar ── */}
            <div className="products-toolbar">
                {/* Search */}
                <div className="products-search-wrap">
                    <span className="products-search-icon">⌕</span>
                    <input
                        type="text"
                        className="products-search"
                        placeholder="Search designs, materials..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            className="products-search-clear"
                            onClick={() => setSearch("")}
                        >
                            ×
                        </button>
                    )}
                </div>

                <div className="products-toolbar-right">
                    {/* Filter toggle */}
                    <button
                        className={`products-filter-btn ${showFilters ? "active" : ""}`}
                        onClick={() => setShowFilters((v) => !v)}
                    >
                        ⊟ Filters
                    </button>

                    {/* Sort */}
                    <select
                        className="products-sort"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        {SORT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Filter Panel ── */}
            {showFilters && (
                <div className="products-filters">
                    {/* Category quick-nav */}
                    <div className="filter-group">
                        <label>Category</label>
                        <div className="filter-tags">
                            {CATEGORIES.map((c) => (
                                <button
                                    key={c.value}
                                    className={`filter-tag ${c.value === category ? "active" : ""}`}
                                    onClick={() => navigate(`/products/${c.value}`)}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Material */}
                    <div className="filter-group">
                        <label>Material</label>
                        <div className="filter-tags">
                            <button
                                className={`filter-tag ${!filterMat ? "active" : ""}`}
                                onClick={() => setFilterMat("")}
                            >
                                All
                            </button>
                            {allMaterials.map((m) => (
                                <button
                                    key={m}
                                    className={`filter-tag ${filterMat === m ? "active" : ""}`}
                                    onClick={() => setFilterMat(m)}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Clear */}
                    <button
                        className="filter-clear-btn"
                        onClick={() => { setSearch(""); setFilterMat(""); setSortBy("default"); }}
                    >
                        Clear All Filters
                    </button>
                </div>
            )}

            {/* ── Results count ── */}
            <div className="products-results-bar">
                <span>{filtered.length} design{filtered.length !== 1 ? "s" : ""} found</span>
            </div>

            {/* ── Grid ── */}
            {filtered.length === 0 ? (
                <EmptyState
                    icon="◇"
                    title="No designs found"
                    message="Try adjusting your search or filter criteria."
                    cta="Clear Filters"
                    ctaPath={`/products/${category}`}
                />
            ) : (
                <div className="products-grid">
                    {filtered.map((product) => (
                        <div
                            className="product-card"
                            key={product.id}
                            style={{ cursor: "pointer" }}
                        >
                            {/* Image + Wishlist */}
                            <div className="product-image" onClick={() => navigate(`/product/${product.id}`)}>
                                <img src={product.image} alt={product.title} />
                                <button
                                    className={`product-wishlist-btn ${wishlisted[product.id] ? "wished" : ""}`}
                                    onClick={(e) => toggleWishlist(e, product)}
                                    title={wishlisted[product.id] ? "Remove from wishlist" : "Add to wishlist"}
                                >
                                    {wishlisted[product.id] ? "♥" : "♡"}
                                </button>
                                {product.popular && (
                                    <span className="product-badge">Popular</span>
                                )}
                            </div>

                            {/* Info */}
                            <div
                                className="product-info"
                                onClick={() => navigate(`/product/${product.id}`)}
                            >
                                <h2>{product.title}</h2>
                                <p className="product-size">Size: {product.size}</p>
                            </div>

                            {/* Buttons */}
                            <div className="product-buttons">
                                <button
                                    className="quote"
                                    onClick={() => navigate(`/?consultancy=true&product_id=${product.id}`)}
                                >
                                    Get Quote
                                </button>
                                <button
                                    className="view"
                                    onClick={() => navigate(`/product/${product.id}`)}
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Footer />
        </div>
    );
};

export default Products;