import "./wishlist.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    collection, onSnapshot, deleteDoc, doc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast/Toast";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import Loader from "../../components/Loader/Loader";
import EmptyState from "../../components/EmptyState/EmptyState";

const Wishlist = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast, ToastContainer } = useToast();

    const [items, setItems]     = useState([]);
    const [loading, setLoading] = useState(true);

    /* ── Real-time Firestore listener ── */
    useEffect(() => {
        if (!user) return;

        const colRef = collection(db, "wishlist", user.uid, "items");
        const unsub  = onSnapshot(
            colRef,
            (snap) => {
                setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoading(false);
            },
            (err) => {
                console.error("Wishlist load error:", err);
                setLoading(false);
            }
        );
        return () => unsub();
    }, [user]);

    /* ── Remove item ── */
    const handleRemove = async (productId) => {
        try {
            await deleteDoc(doc(db, "wishlist", user.uid, "items", productId));
            showToast("Removed from wishlist", "info");
        } catch (err) {
            console.error(err);
            showToast("Failed to remove item", "error");
        }
    };

    return (
        <div className="wishlist-root">
            <Navbar />
            <ToastContainer />

            <main className="wishlist-main">
                <div className="wishlist-header">
                    <h1>My Wishlist</h1>
                    <span className="wishlist-count">
                        {items.length} {items.length === 1 ? "item" : "items"}
                    </span>
                </div>

                {loading ? (
                    <Loader fullPage />
                ) : items.length === 0 ? (
                    <EmptyState
                        icon="♡"
                        title="Your wishlist is empty"
                        message="Browse our designs and save your favourites here."
                        cta="Explore Designs"
                        ctaPath="/products/living-room"
                    />
                ) : (
                    <div className="wishlist-grid">
                        {items.map((item) => (
                            <div className="wishlist-card" key={item.id}>
                                <div
                                    className="wishlist-card-image"
                                    onClick={() => navigate(`/product/${item.productId}`)}
                                >
                                    <img src={item.image} alt={item.title} />
                                </div>

                                <div className="wishlist-card-info">
                                    <h3
                                        onClick={() => navigate(`/product/${item.productId}`)}
                                    >
                                        {item.title}
                                    </h3>
                                    <p className="wishlist-size">{item.size}</p>
                                    <p className="wishlist-price">
                                        ₹{item.price?.toLocaleString("en-IN")}
                                    </p>
                                </div>

                                <div className="wishlist-card-actions">
                                    <button
                                        className="wishlist-view-btn"
                                        onClick={() => navigate(`/product/${item.productId}`)}
                                    >
                                        View Details
                                    </button>
                                    <button
                                        className="wishlist-remove-btn"
                                        onClick={() => handleRemove(item.productId)}
                                        title="Remove from wishlist"
                                    >
                                        ✕ Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default Wishlist;
