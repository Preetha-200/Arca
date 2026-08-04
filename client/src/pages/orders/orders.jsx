import "./orders.css";
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import Loader from "../../components/Loader/Loader";
import EmptyState from "../../components/EmptyState/EmptyState";

/* ── Utility: format a Firestore Timestamp or ISO string ── */
const formatDate = (ts) => {
    if (!ts) return "—";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString("en-IN", {
        day:   "2-digit",
        month: "short",
        year:  "numeric",
    });
};

/* ── Status badge colour ── */
const statusColor = (status) => {
    switch (status) {
        case "Confirmed":   return "#2e7d32";
        case "Processing":  return "#f57c00";
        case "Cancelled":   return "#c62828";
        default:            return "#555";
    }
};

const Orders = () => {
    const { user }  = useAuth();
    const navigate  = useNavigate();

    const [orders,    setOrders]    = useState([]);
    const [loading,   setLoading]   = useState(true);

    /* ── Product orders ── */
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, "orders", user.uid, "items"),
            orderBy("createdAt", "desc")
        );
        const unsub = onSnapshot(
            q,
            (snap) => {
                setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoading(false);
            },
            (err) => { console.error(err); setLoading(false); }
        );
        return () => unsub();
    }, [user]);

    return (
        <div className="orders-root">
            <Navbar />

            <main className="orders-main">
                <div className="orders-page-header">
                    <h1>My Orders</h1>
                    <p>Track your interior design orders</p>
                </div>

                {loading ? (
                    <Loader fullPage />
                ) : orders.length === 0 ? (
                    <>
                        <EmptyState
                            icon="≡"
                            title="No orders yet"
                            message="Your design orders will appear here after checkout."
                            cta="Browse Designs"
                            ctaPath="/products/living-room"
                        />
                        <div style={{
                            textAlign:  "center",
                            marginTop:  "24px",
                            fontFamily: "Belleza, sans-serif",
                            fontSize:   "14px",
                            color:      "#888",
                        }}>
                            Looking for your consultations?{" "}
                            <button
                                onClick={() => navigate("/bookings")}
                                style={{
                                    background:  "none",
                                    border:      "none",
                                    color:       "#470606",
                                    cursor:      "pointer",
                                    fontFamily:  "Belleza, sans-serif",
                                    fontSize:    "14px",
                                    textDecoration: "underline",
                                }}
                            >
                                View My Bookings →
                            </button>
                        </div>
                    </>
                ) : (
                    <section className="orders-section">
                        <h2 className="orders-section-title">Design Orders</h2>
                        <div className="orders-list">
                            {orders.map((order) => (
                                <div className="order-card" key={order.id}>
                                    <div className="order-card-top">
                                        <div className="order-meta">
                                            <span className="order-id">
                                                Order #{order.orderId?.slice(-8).toUpperCase()}
                                            </span>
                                            <span className="order-date">
                                                {formatDate(order.createdAt)}
                                            </span>
                                        </div>
                                        <span
                                            className="order-status-badge"
                                            style={{ background: statusColor(order.status) }}
                                        >
                                            {order.status || "Confirmed"}
                                        </span>
                                    </div>

                                    {/* Item thumbnails */}
                                    <div className="order-items-row">
                                        {(order.items || []).map((item, idx) => (
                                            <div className="order-item-thumb" key={idx}>
                                                <img src={item.image} alt={item.title} />
                                                <div className="order-item-thumb-info">
                                                    <p>{item.title}</p>
                                                    <span>Qty: {item.qty || 1}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="order-card-bottom">
                                        <span className="order-items-count">
                                            {(order.items || []).length}{" "}
                                            {(order.items || []).length === 1 ? "item" : "items"}
                                        </span>
                                        <span className="order-total">
                                            Total: ₹{(order.total || 0).toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default Orders;
