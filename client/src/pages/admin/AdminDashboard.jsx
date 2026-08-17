import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, query, onSnapshot, doc, updateDoc, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import "./admin.css";

const AdminDashboard = () => {
    const { user, userRole, loading } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0
    });
    const [recentBookings, setRecentBookings] = useState([]);
    const [notifications, setNotifications] = useState([]);

    // Role Guard
    useEffect(() => {
        if (!loading && (!user || userRole !== "admin")) {
            navigate("/admin/login", { replace: true });
        }
    }, [user, userRole, loading, navigate]);

    // Fetch Stats (from bookings) and Notifications
    useEffect(() => {
        if (userRole !== "admin") return;

        // Listen to bookings collection for stats and recent list
        const bookingsQ = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
        const unsubBookings = onSnapshot(bookingsQ, (snap) => {
            const counts = { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, rescheduled: 0 };
            const recent = [];
            snap.forEach(doc => {
                counts.total++;
                const data = doc.data();
                const status = data.status?.toLowerCase() || "pending";
                if (counts[status] !== undefined) counts[status]++;
                
                if (recent.length < 5) {
                    recent.push({ id: doc.id, ...data });
                }
            });
            setStats(counts);
            setRecentBookings(recent);
        });

        // Listen to notifications
        const notifQ = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
        const unsubNotifs = onSnapshot(notifQ, (snap) => {
            const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setNotifications(notifs);
        });

        return () => {
            unsubBookings();
            unsubNotifs();
        };
    }, [userRole]);

    const markAsRead = async (id) => {
        try {
            await updateDoc(doc(db, "notifications", id), { read: true });
        } catch (err) {
            console.error(err);
        }
    };

    const markAllAsRead = async () => {
        const unread = notifications.filter(n => !n.read);
        for (const n of unread) {
            await markAsRead(n.id);
        }
    };

    if (loading || userRole !== "admin") return null;

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <Navbar />
            
            <main className="admin-page">
                <div className="admin-header">
                    <h1>Admin Dashboard</h1>
                    <div className="admin-header-actions">
                        <Link to="/admin/bookings" className="admin-btn">Manage Bookings</Link>
                    </div>
                </div>

                <div className="admin-grid">
                    <div className="admin-stat-card">
                        <h3>Total Bookings</h3>
                        <div className="stat-value">{stats.total}</div>
                    </div>
                    <div className="admin-stat-card">
                        <h3>Pending</h3>
                        <div className="stat-value" style={{color: '#856404'}}>{stats.pending}</div>
                    </div>
                    <div className="admin-stat-card">
                        <h3>Confirmed</h3>
                        <div className="stat-value" style={{color: '#155724'}}>{stats.confirmed}</div>
                    </div>
                    <div className="admin-stat-card">
                        <h3>Completed</h3>
                        <div className="stat-value" style={{color: '#383d41'}}>{stats.completed}</div>
                    </div>
                </div>

                <div className="admin-notifications" style={{ marginBottom: "40px" }}>
                    <h2 className="admin-section-title">Recent Bookings</h2>
                    {recentBookings.length === 0 ? (
                        <p style={{ fontFamily: "Belleza", color: "#666" }}>No recent bookings.</p>
                    ) : (
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Customer</th>
                                        <th>Consultation</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentBookings.map(b => (
                                        <tr key={b.id}>
                                            <td>{b.name || b.customerName || "N/A"}</td>
                                            <td>{b.consultationType || "N/A"}</td>
                                            <td>
                                                {b.createdAt?.toDate 
                                                    ? b.createdAt.toDate().toLocaleDateString()
                                                    : "N/A"}
                                            </td>
                                            <td>
                                                <span className={`status-badge ${b.status?.toLowerCase() || "pending"}`}>
                                                    {b.status || "Pending"}
                                                </span>
                                            </td>
                                            <td>
                                                <Link to={`/admin/bookings?id=${b.id}`} className="action-btn">
                                                    Manage
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="admin-notifications">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
                        <h2 className="admin-section-title" style={{ border: "none", margin: 0, padding: 0 }}>
                            Notifications {unreadCount > 0 && `(${unreadCount})`}
                        </h2>
                        {unreadCount > 0 && (
                            <button className="admin-btn secondary" onClick={markAllAsRead}>
                                Mark All as Read
                            </button>
                        )}
                    </div>
                    
                    {notifications.length === 0 ? (
                        <p style={{ fontFamily: "Belleza", color: "#666" }}>No notifications.</p>
                    ) : (
                        notifications.map(n => (
                            <div key={n.id} className={`admin-notification-item ${!n.read ? "unread" : ""}`}>
                                <div className="admin-notification-content">
                                    <p>{n.message}</p>
                                    <div className="admin-notification-time">
                                        {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : ""}
                                    </div>
                                </div>
                                {!n.read && (
                                    <button className="action-btn" onClick={() => markAsRead(n.id)}>
                                        Mark as read
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default AdminDashboard;
