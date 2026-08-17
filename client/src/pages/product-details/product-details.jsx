import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
    doc, deleteDoc, getDoc, setDoc,
    collection, addDoc, onSnapshot, query, orderBy, serverTimestamp,
} from "firebase/firestore";

import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast/Toast";
import { products, getProductById } from "../../data/products";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import Loader from "../../components/Loader/Loader";
import "../products/products.css"; // Import product card styles
import "./product-details.css";

/* ── Star Rating Component ── */
const StarRating = ({ value, onChange, readonly = false }) => {
    const [hovered, setHovered] = useState(0);
    return (
        <div className="star-rating">
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    className={`star ${(hovered || value) >= star ? "filled" : ""}`}
                    onClick={() => !readonly && onChange?.(star)}
                    onMouseEnter={() => !readonly && setHovered(star)}
                    onMouseLeave={() => !readonly && setHovered(0)}
                    style={{ cursor: readonly ? "default" : "pointer" }}
                >
                    ★
                </span>
            ))}
        </div>
    );
};

const ProductDetails = () => {
    const { id }     = useParams();
    const navigate   = useNavigate();
    const { user }   = useAuth();
    const { showToast, ToastContainer } = useToast();

    const product = getProductById(id);

    /* ── Scroll to top on navigation ── */
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    const [wishlisted,   setWishlisted]   = useState(false);
    const [reviews,      setReviews]      = useState([]);
    const [newRating,    setNewRating]    = useState(0);
    const [newComment,   setNewComment]   = useState("");
    const [submitting,   setSubmitting]   = useState(false);
    const [loadingWL,    setLoadingWL]    = useState(true);

    /* ── Load wishlist state ── */
    useEffect(() => {
        if (!user || !product) { setLoadingWL(false); return; }
        getDoc(doc(db, "wishlist", user.uid, "items", product.id))
            .then((snap) => setWishlisted(snap.exists()))
            .catch(console.error)
            .finally(() => setLoadingWL(false));
    }, [user, product]);

    /* ── Real-time reviews ── */
    useEffect(() => {
        if (!product) return;
        const q    = query(
            collection(db, "reviews", product.id, "entries"),
            orderBy("createdAt", "desc")
        );
        const unsub = onSnapshot(q, (snap) => {
            setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [product]);

    /* ── Wishlist toggle ── */
    const toggleWishlist = async () => {
        if (!user) { showToast("Sign in to save to your wishlist", "info"); return; }
        const ref = doc(db, "wishlist", user.uid, "items", product.id);
        try {
            if (wishlisted) {
                await deleteDoc(ref);
                setWishlisted(false);
                showToast("Removed from wishlist", "info");
            } else {
                await setDoc(ref, {
                    productId: product.id,
                    title:     product.title,
                    image:     product.image,
                    size:      product.size,
                    addedAt:   new Date().toISOString(),
                });
                setWishlisted(true);
                showToast("Added to wishlist", "success");
            }
        } catch (err) {
            console.error(err);
            showToast("Failed to update wishlist", "error");
        }
    };

    /* ── Book Consultancy ── */
    const bookConsultancy = () => {
        if (!user) {
            showToast("Sign in to book a consultation", "info");
            navigate("/signin");
            return;
        }
        navigate(`/?consultancy=true&product_id=${product.id}`);
    };

    /* ── Submit review ── */
    const submitReview = async () => {
        if (!user) { showToast("Sign in to leave a review", "info"); return; }
        if (newRating === 0) { showToast("Please select a rating", "error"); return; }
        if (!newComment.trim()) { showToast("Please write a comment", "error"); return; }

        setSubmitting(true);
        try {
            await addDoc(collection(db, "reviews", product.id, "entries"), {
                uid:       user.uid,
                name:      user.displayName || "Anonymous",
                rating:    newRating,
                comment:   newComment.trim(),
                createdAt: serverTimestamp(),
            });
            setNewRating(0);
            setNewComment("");
            showToast("Review submitted!", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to submit review", "error");
        }
        setSubmitting(false);
    };

    /* ── Average rating ── */
    const avgRating = reviews.length
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    /* ── Related products ── */
    const related = products
        .filter((p) => p.category === product?.category && p.id !== product?.id)
        .slice(0, 5);

    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") setIsLightboxOpen(false);
        };
        if (isLightboxOpen) {
            window.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden"; // prevent scrolling when open
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [isLightboxOpen]);

    if (!product) {
        return (
            <div style={{ padding: "40px", fontFamily: "Belleza, sans-serif" }}>
                Product not found.{" "}
                <button onClick={() => navigate(-1)} style={{ color: "#470606", cursor: "pointer", background: "none", border: "none" }}>
                    Go back
                </button>
            </div>
        );
    }

    return (
        <section id="product-details">
            <Navbar />
            <ToastContainer />

            {/* ── Main Details ── */}
            <div className="product-details">
                {/* Left: Image */}
                <div className="product-details-left">
                    <img 
                        src={product.image} 
                        alt={product.title} 
                        onClick={() => setIsLightboxOpen(true)}
                        style={{ cursor: "zoom-in" }}
                    />
                </div>

                {/* Right: Info */}
                <div className="product-details-right">
                    {product.popular && (
                        <span className="pd-popular-badge">Popular Choice</span>
                    )}
                    <h1>{product.title}</h1>

                    {/* Rating summary */}
                    {avgRating && (
                        <div className="pd-avg-rating">
                            <StarRating value={Math.round(parseFloat(avgRating))} readonly />
                            <span>{avgRating} ({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
                        </div>
                    )}

                    <div className="pd-meta">
                        <div className="pd-meta-row">
                            <span className="pd-meta-label">Size</span>
                            <span>{product.size}</span>
                        </div>
                        <div className="pd-meta-row">
                            <span className="pd-meta-label">Material</span>
                            <span>{product.material}</span>
                        </div>
                        <div className="pd-meta-row">
                            <span className="pd-meta-label">Room Type</span>
                            <span>{product.roomType}</span>
                        </div>
                    </div>

                    <p className="description">{product.description}</p>

                    {/* Actions */}
                    <div className="product-actions">
                        <button
                            className="pd-cart-btn"
                            onClick={bookConsultancy}
                        >
                            Get Quote
                        </button>
                        
                        <button
                            className="pd-cart-btn pd-secondary-btn"
                            onClick={bookConsultancy}
                        >
                            Book Consultancy
                        </button>

                        <button
                            className={`pd-wishlist-btn ${wishlisted ? "wished" : ""}`}
                            onClick={toggleWishlist}
                            disabled={loadingWL}
                        >
                            {wishlisted
                                ? <><span className="material-symbols-outlined" style={{fontSize:"16px",marginRight:"4px",verticalAlign:"middle",fontVariationSettings:"'FILL' 1"}}>favorite</span>Wishlisted</>
                                : <><span className="material-symbols-outlined" style={{fontSize:"16px",marginRight:"4px",verticalAlign:"middle"}}>favorite</span>Wishlist</>
                            }
                        </button>

                    </div>
                </div>
            </div>

            {/* ── Lightbox Modal ── */}
            {isLightboxOpen && (
                <div className="lightbox-overlay" onClick={() => setIsLightboxOpen(false)} aria-modal="true" role="dialog">
                    <div className="lightbox-content" onClick={e => e.stopPropagation()}>
                        <button className="lightbox-close" onClick={() => setIsLightboxOpen(false)} aria-label="Close image">×</button>
                        <img src={product.image} alt={product.title} className="lightbox-image" />
                    </div>
                </div>
            )}

            {/* ── Related Products ── */}
            {related.length > 0 && (
                <div className="pd-related">
                    <div className="pd-related-header">
                        <h2 className="pd-section-title">Related Designs</h2>
                        <span 
                            className="pd-view-more-link"
                            onClick={() => navigate(`/products/${product.category}`)}
                        >
                            View More &gt;
                        </span>
                    </div>
                    <div className="pd-related-grid">
                        {related.map((p) => (
                            <div
                                className="pd-related-card product-card"
                                key={p.id}
                            >
                                {/* Image */}
                                <div className="product-image" onClick={() => navigate(`/product/${p.id}`)}>
                                    <img src={p.image} alt={p.title} />
                                    {p.popular && (
                                        <span className="product-badge">Popular</span>
                                    )}
                                </div>

                                {/* Info */}
                                <div
                                    className="product-info"
                                    onClick={() => navigate(`/product/${p.id}`)}
                                >
                                    <h2>{p.title}</h2>
                                    <p className="product-size">{p.size}</p>
                                    <p className="product-material">{p.material}</p>
                                </div>

                                {/* Buttons */}
                                <div className="product-buttons">
                                    <button
                                        className="quote"
                                        onClick={() => navigate(`/?consultancy=true&product_id=${p.id}`)}
                                    >
                                        Get Quote
                                    </button>
                                    <button
                                        className="view"
                                        onClick={() => navigate(`/product/${p.id}`)}
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Reviews ── */}
            <div className="pd-reviews">
                <h2 className="pd-section-title">
                    Customer Reviews
                    {avgRating && (
                        <span className="pd-avg-tag">
                            ★ {avgRating} avg
                        </span>
                    )}
                </h2>

                {/* Write review */}
                <div className="pd-review-form">
                    <p className="pd-review-form-title">Write a Review</p>
                    <StarRating value={newRating} onChange={setNewRating} />
                    <textarea
                        className="pd-review-textarea"
                        placeholder="Share your experience with this design..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={4}
                    />
                    <button
                        className="pd-review-submit"
                        onClick={submitReview}
                        disabled={submitting}
                    >
                        {submitting ? "Submitting..." : "Submit Review"}
                    </button>
                </div>

                {/* Review list */}
                {reviews.length === 0 ? (
                    <p className="pd-no-reviews">
                        No reviews yet. Be the first to review this design!
                    </p>
                ) : (
                    <div className="pd-review-list">
                        {reviews.map((r) => (
                            <div className="pd-review-item" key={r.id}>
                                <div className="pd-review-top">
                                    <div className="pd-reviewer-circle">
                                        {r.name?.charAt(0)?.toUpperCase() || "?"}
                                    </div>
                                    <div>
                                        <p className="pd-reviewer-name">{r.name}</p>
                                        <StarRating value={r.rating} readonly />
                                    </div>
                                    <span className="pd-review-date">
                                        {r.createdAt?.toDate
                                            ? r.createdAt.toDate().toLocaleDateString("en-IN", {
                                                day: "2-digit", month: "short", year: "numeric",
                                              })
                                            : ""}
                                    </span>
                                </div>
                                <p className="pd-review-comment">{r.comment}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Footer />
        </section>
    );
};

export default ProductDetails;