import "./cart.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    collection, onSnapshot, deleteDoc, doc,
    updateDoc, writeBatch, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast/Toast";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import Loader from "../../components/Loader/Loader";
import EmptyState from "../../components/EmptyState/EmptyState";

const Cart = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast, ToastContainer } = useToast();

    const [items, setItems]       = useState([]);
    const [loading, setLoading]   = useState(true);
    const [placing, setPlacing]   = useState(false);

    /* ── Real-time Firestore listener ── */
    useEffect(() => {
        if (!user) return;

        const colRef = collection(db, "cart", user.uid, "items");
        const unsub  = onSnapshot(
            colRef,
            (snap) => {
                setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoading(false);
            },
            (err) => {
                console.error("Cart load error:", err);
                setLoading(false);
            }
        );
        return () => unsub();
    }, [user]);

    /* ── Update quantity ── */
    const updateQty = async (productId, newQty) => {
        if (newQty < 1) { handleRemove(productId); return; }
        try {
            await updateDoc(doc(db, "cart", user.uid, "items", productId), { qty: newQty });
        } catch (err) {
            console.error(err);
            showToast("Failed to update quantity", "error");
        }
    };

    /* ── Remove item ── */
    const handleRemove = async (productId) => {
        try {
            await deleteDoc(doc(db, "cart", user.uid, "items", productId));
            showToast("Item removed from cart", "info");
        } catch (err) {
            console.error(err);
            showToast("Failed to remove item", "error");
        }
    };

    /* ── Place Order ── */
    const handlePlaceOrder = async () => {
        if (items.length === 0) return;
        setPlacing(true);

        try {
            const batch      = writeBatch(db);
            const orderId    = `order_${Date.now()}`;
            const orderRef   = doc(db, "orders", user.uid, "items", orderId);

            // Write order document
            batch.set(orderRef, {
                orderId,
                items:     items.map(({ productId, title, image, qty }) => ({
                    productId, title, image, qty,
                })),
                status:    "Confirmed",
                createdAt: serverTimestamp(),
            });

            // Delete all cart items
            items.forEach((item) => {
                batch.delete(doc(db, "cart", user.uid, "items", item.productId));
            });

            await batch.commit();
            showToast("Order placed successfully! 🎉", "success");
            navigate("/orders");
        } catch (err) {
            console.error(err);
            showToast("Failed to place order. Please try again.", "error");
        }
        setPlacing(false);
    };

    /* ── Totals ── */
    const itemCount = items.reduce((sum, i) => sum + (i.qty || 1), 0);

    return (
        <div className="cart-root">
            <Navbar />
            <ToastContainer />

            <main className="cart-main">
                <div className="cart-page-header">
                    <h1>My Cart</h1>
                    <span className="cart-count">
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                    </span>
                </div>

                {loading ? (
                    <Loader fullPage />
                ) : items.length === 0 ? (
                    <EmptyState
                        icon="⊡"
                        title="Your cart is empty"
                        message="Add interior designs you love to your cart and order them here."
                        cta="Browse Designs"
                        ctaPath="/products/living-room"
                    />
                ) : (
                    <div className="cart-layout">
                        {/* ── Items ── */}
                        <div className="cart-items">
                            {items.map((item) => (
                                <div className="cart-item" key={item.id}>
                                    <div
                                        className="cart-item-image"
                                        onClick={() => navigate(`/product/${item.productId}`)}
                                    >
                                        <img src={item.image} alt={item.title} />
                                    </div>

                                    <div className="cart-item-details">
                                        <h3 onClick={() => navigate(`/product/${item.productId}`)}>
                                            {item.title}
                                        </h3>
                                        <p className="cart-item-size">{item.size}</p>
                                    </div>

                                    <div className="cart-item-controls">
                                        <div className="cart-qty-row">
                                            <button
                                                className="cart-qty-btn"
                                                onClick={() => updateQty(item.productId, (item.qty || 1) - 1)}
                                            >
                                                −
                                            </button>
                                            <span className="cart-qty-val">{item.qty || 1}</span>
                                            <button
                                                className="cart-qty-btn"
                                                onClick={() => updateQty(item.productId, (item.qty || 1) + 1)}
                                            >
                                                +
                                            </button>
                                        </div>
                                        <button
                                            className="cart-remove-btn"
                                            onClick={() => handleRemove(item.productId)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ── Summary ── */}
                        <div className="cart-summary">
                            <h2>Order Summary</h2>

                            <div className="cart-summary-rows">
                                {items.map((item) => (
                                    <div className="cart-summary-row" key={item.id}>
                                        <span>{item.title}</span>
                                        <span>Qty: {item.qty || 1}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="cart-summary-divider" />

                            <p className="cart-summary-note">
                                * Final pricing will be provided by an ARCA designer during the consultation.
                            </p>

                            <button
                                className="cart-place-order-btn"
                                onClick={handlePlaceOrder}
                                disabled={placing}
                            >
                                {placing ? "Placing Order..." : "Place Order →"}
                            </button>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default Cart;
