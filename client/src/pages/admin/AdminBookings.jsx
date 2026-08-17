import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, onSnapshot, doc, updateDoc, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import { useToast } from "../../components/Toast/Toast";
import "./admin.css";

const AdminBookings = () => {
    const { user, userRole, loading } = useAuth();
    const navigate = useNavigate();
    const { showToast, ToastContainer } = useToast();

    const [bookings, setBookings] = useState([]);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [designerName, setDesignerName] = useState("");

    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTime, setScheduledTime] = useState("");

    // Role Guard
    useEffect(() => {
        if (!loading && (!user || userRole !== "admin")) {
            navigate("/admin/login", { replace: true });
        }
    }, [user, userRole, loading, navigate]);

    // Fetch Bookings
    useEffect(() => {
        if (userRole !== "admin") return;

        const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setBookings(data);
        });

        return () => unsub();
    }, [userRole]);

    const openModal = (booking) => {
        setSelectedBooking(booking);
        setDesignerName(booking.designerName || "");
        setScheduledDate(booking.scheduledDate || "");
        setScheduledTime(booking.scheduledTime || "");
    };

    const closeModal = () => {
        setSelectedBooking(null);
        setDesignerName("");
        setScheduledDate("");
        setScheduledTime("");
    };

    const handleConfirmBooking = async () => {
        if (!selectedBooking) return;
        if (!designerName || !scheduledDate || !scheduledTime) {
            showToast("Please fill in all fields (Designer, Date, Time).", "error");
            return;
        }

        try {
            const token = await auth.currentUser.getIdToken();
            
            const apiUrl = process.env.NODE_ENV === 'development' 
                ? 'http://localhost:5000/admin/confirm-booking'
                : 'https://arca-aq2o.onrender.com/admin/confirm-booking';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    bookingId: selectedBooking.id,
                    scheduledDate,
                    scheduledTime,
                    assignedDesigner: designerName
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to confirm booking.");
            }

            showToast("Booking confirmed successfully.", "success");
            closeModal();
        } catch (err) {
            console.error(err);
            showToast(err.message || "An error occurred.", "error");
        }
    };

    if (loading || userRole !== "admin") return null;

    return (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <Navbar />
            <ToastContainer />
            
            <main className="admin-page">
                <div className="admin-header">
                    <h1>Manage Bookings</h1>
                    <button className="admin-btn secondary" onClick={() => navigate("/admin/dashboard")}>
                        Back to Dashboard
                    </button>
                </div>

                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Booking ID</th>
                                <th>Customer</th>
                                <th>Consultation</th>
                                <th>Requested</th>
                                <th>Status</th>
                                <th>Designer</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>No bookings found.</td>
                                </tr>
                            ) : (
                                bookings.map(b => (
                                    <tr key={b.id}>
                                        <td>{b.bookingId || b.id}</td>
                                        <td>
                                            {b.name || b.customerName || "N/A"}<br/>
                                            <small style={{color: "#888"}}>{b.email}</small>
                                        </td>
                                        <td>
                                            {b.consultationType || "N/A"}<br/>
                                            <small style={{color: "#888"}}>{b.productName || "No specific product"}</small>
                                        </td>
                                        <td>
                                            {b.createdAt?.toDate ? b.createdAt.toDate().toLocaleDateString() : "N/A"}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${b.status?.toLowerCase() || "pending"}`}>
                                                {b.status || "Pending"}
                                            </span>
                                        </td>
                                        <td>{b.designerName || <em style={{color: "#aaa"}}>Not assigned</em>}</td>
                                        <td>
                                            <button className="action-btn" onClick={() => openModal(b)}>
                                                View / Assign
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Admin Action Modal (Simplified for Task 2) */}
            {selectedBooking && (
                <div className="admin-modal-overlay" onClick={closeModal}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <h2>Manage Booking: {selectedBooking.bookingId || selectedBooking.id}</h2>
                        
                        <div style={{ marginBottom: "20px", fontFamily: "Belleza", color: "#555", lineHeight: "1.6" }}>
                            <p><strong>Customer:</strong> {selectedBooking.name || selectedBooking.customerName}</p>
                            <p><strong>Email:</strong> {selectedBooking.email}</p>
                            <p><strong>Mobile:</strong> {selectedBooking.mobile}</p>
                            <p><strong>City:</strong> {selectedBooking.city}</p>
                            <p><strong>Type:</strong> {selectedBooking.consultationType}</p>
                            <p><strong>Status:</strong> {selectedBooking.status || "Pending"}</p>
                        </div>

                        <div className="form-group">
                            <label>Schedule Date</label>
                            <input 
                                type="date" 
                                value={scheduledDate} 
                                onChange={(e) => setScheduledDate(e.target.value)} 
                                min={new Date().toISOString().split("T")[0]}
                            />
                        </div>

                        <div className="form-group">
                            <label>Schedule Time (e.g. 10:00 AM)</label>
                            <input 
                                type="time" 
                                value={scheduledTime} 
                                onChange={(e) => setScheduledTime(e.target.value)} 
                            />
                        </div>

                        <div className="form-group">
                            <label>Assign Designer</label>
                            <select value={designerName} onChange={(e) => setDesignerName(e.target.value)}>
                                <option value="">Select a designer</option>
                                <option value="Priya Sharma">Priya Sharma</option>
                                <option value="Arjun Mehta">Arjun Mehta</option>
                                <option value="Kavitha Nair">Kavitha Nair</option>
                                <option value="Rahul Verma">Rahul Verma</option>
                                <option value="Sneha Reddy">Sneha Reddy</option>
                                <option value="Vikram Iyer">Vikram Iyer</option>
                            </select>
                        </div>

                        <div className="admin-modal-actions">
                            <button className="admin-btn secondary" onClick={closeModal}>Close</button>
                            <button className="admin-btn" onClick={handleConfirmBooking}>Confirm Booking</button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

export default AdminBookings;
