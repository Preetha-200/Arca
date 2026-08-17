import "./bookings.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, onSnapshot, query, where, orderBy,
} from "firebase/firestore";
import Navbar  from "../../components/Navbar/Navbar";
import Footer  from "../../components/Footer/Footer";
import API_BASE from "../../api";

/* ────────────────────────────────────────────────────────────────── */
/*  UTILITIES                                                         */
/* ────────────────────────────────────────────────────────────────── */

const parseTime = (timeStr) => {
  if (!timeStr) return { hours: 10, minutes: 0 };
  const [timePart, ampm] = timeStr.split(" ");
  let [hours, minutes]   = timePart.split(":").map(Number);
  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
};

const getMeetingDate = (booking) => {
  if (!booking.scheduledDate) return null;
  const [y, m, d]         = booking.scheduledDate.split("-").map(Number);
  const { hours, minutes } = parseTime(booking.scheduledTime);
  return new Date(y, m - 1, d, hours, minutes, 0);
};

const getCountdown = (booking) => {
  const meeting = getMeetingDate(booking);
  if (!meeting) return null;

  const diff  = meeting - Date.now();
  if (diff <= 0) return "Meeting passed";

  const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hrs   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days === 0 && hrs === 0) return `Starts in ${mins}m`;
  if (days === 0) return `Starts in ${hrs}h ${mins}m`;
  if (days === 1) return "Starts Tomorrow";
  return `Starts in ${days} Days`;
};

const sortBookings = (list) => {
  const now  = Date.now();
  const rank = (b) => {
    const mt = getMeetingDate(b);
    if ((b.status === "Confirmed" || b.status === "Rescheduled") && mt && mt > now) return 0;
    if (b.status === "Confirmed" || b.status === "Rescheduled") return 1;
    if (b.status === "pending" || b.status === "Pending") return 2;
    if (b.status === "Completed" || b.status === "completed") return 3;
    return 4; // Cancelled
  };
  return [...list].sort((a, b) => rank(a) - rank(b));
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
};

/* ────────────────────────────────────────────────────────────────── */
/*  STATUS BADGE                                                      */
/* ────────────────────────────────────────────────────────────────── */
const StatusBadge = ({ status, hasPassed }) => {
  let displayStatus = status || "Confirmed";
  if ((status === "Confirmed" || status === "confirmed") && hasPassed) {
    displayStatus = "Missed";
  }
  if (status === "completed" || status === "Completed") {
    displayStatus = "Completed";
  }
  return (
    <span className={`bk-badge bk-badge-${displayStatus.toLowerCase()}`}>
      {displayStatus}
    </span>
  );
};

/* ────────────────────────────────────────────────────────────────── */
/*  HERO BOOKING CARD                                                 */
/* ────────────────────────────────────────────────────────────────── */
const HeroCard = ({ booking, onViewDetails, onComplete }) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const meetingTime = getMeetingDate(booking);
  const now = Date.now();
  
  const isPending = booking.status === "pending" || booking.status === "Pending";
  const isCompleted = booking.status === "completed" || booking.status === "Completed";
  const isCancelled = booking.status === "cancelled" || booking.status === "Cancelled";
  const isConfirmed = booking.status === "confirmed" || booking.status === "Confirmed" || booking.status === "Rescheduled" || booking.status === "rescheduled";

  const hasPassed = meetingTime && now >= meetingTime;
  const isOver = isConfirmed && hasPassed;
  const canJoin = isConfirmed && meetingTime && now >= meetingTime - 5 * 60 * 1000 && !isOver && !isCompleted && !isCancelled;

  const countdown = getCountdown(booking);

  const title = booking.consultationType
    ? `${booking.consultationType} Consultation`
    : "Interior Design Consultation";

  return (
    <div className="bhc-card">
      <div className="bhc-top-row">
        <StatusBadge status={booking.status} hasPassed={hasPassed} />
        {countdown && countdown !== "Meeting passed" && !isCompleted && !isCancelled && (
          <span className="bhc-countdown"><span className="material-symbols-outlined" style={{fontSize:"16px"}}>schedule</span> {countdown}</span>
        )}
      </div>

      <h2 className="bhc-title">{title}</h2>
      <p className="bhc-booking-id">Booking ID: {booking.id || "—"}</p>

      <div className="bhc-meta-grid">
        <div className="bhc-meta-item">
          <span className="bhc-meta-icon"><span className="material-symbols-outlined">calendar_today</span></span>
          <div>
            <p className="bhc-meta-label">Scheduled Date</p>
            <p className="bhc-meta-value">
              {isPending ? "Pending Confirmation" : (booking.scheduledDateDisplay || fmtDate(booking.scheduledDate) || "TBD")}
            </p>
          </div>
        </div>

        <div className="bhc-meta-item">
          <span className="bhc-meta-icon"><span className="material-symbols-outlined">access_time</span></span>
          <div>
            <p className="bhc-meta-label">Meeting Time</p>
            <p className="bhc-meta-value">{isPending ? "Pending" : (booking.scheduledTime ? `${booking.scheduledTime} IST` : "TBD")}</p>
          </div>
        </div>
        
        {booking.productName && (
          <div className="bhc-meta-item">
            <span className="bhc-meta-icon"><span className="material-symbols-outlined">chair</span></span>
            <div>
              <p className="bhc-meta-label">Product/Design</p>
              <p className="bhc-meta-value">{booking.productName}</p>
            </div>
          </div>
        )}

        {booking.projectType && (
          <div className="bhc-meta-item">
            <span className="bhc-meta-icon"><span className="material-symbols-outlined">home</span></span>
            <div>
              <p className="bhc-meta-label">Project Type</p>
              <p className="bhc-meta-value">{booking.projectType} - {booking.propertyType || "N/A"}</p>
            </div>
          </div>
        )}

        <div className="bhc-meta-item">
          <span className="bhc-meta-icon"><span className="material-symbols-outlined">person</span></span>
          <div>
            <p className="bhc-meta-label">Assigned Designer</p>
            <p className="bhc-meta-value">{isPending ? "Pending Assignment" : (booking.designerName || "To be assigned")}</p>
          </div>
        </div>

        <div className="bhc-meta-item">
          <span className="bhc-meta-icon"><span className="material-symbols-outlined">videocam</span></span>
          <div>
            <p className="bhc-meta-label">Meeting Info</p>
            <p className="bhc-meta-value">{isPending ? "Link available upon confirmation" : (booking.meetingUrl ? "Google Meet" : "Link not available yet")}</p>
          </div>
        </div>
      </div>

      <div className="bhc-actions">
        <button className="bhc-view-btn" onClick={() => onViewDetails(booking)}>
          View Details
        </button>

        <button
          className={`bhc-join-btn ${(!canJoin || !booking.meetingUrl) ? "bhc-join-disabled" : ""}`}
          disabled={!canJoin || !booking.meetingUrl}
          onClick={() => {
            if (booking.meetingUrl) {
              window.open(booking.meetingUrl, "_blank");
              onComplete && onComplete(booking.id, true);
            }
          }}
          title={canJoin ? "Join Google Meet" : "Available 5 minutes before the meeting"}
        >
          Join Meeting
        </button>
      </div>

      {!canJoin && !isCompleted && !isCancelled && isConfirmed && !isOver && (
        <p className="bhc-join-note">
          {booking.meetingUrl 
            ? "The Join Meeting button will be enabled 5 minutes before your scheduled time." 
            : "Meeting link will be provided shortly."}
        </p>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────── */
/*  SMALL BOOKING CARD (history)                                     */
/* ────────────────────────────────────────────────────────────────── */
const SmallCard = ({ booking, onViewDetails }) => {
  const roomImages = {
    "Living Room":  "/livingRoom.png",
    "Kitchen":      "/kitchen.png",
    "Bedroom":      "/bedroom.png",
    "Dining Room":  "/dining.png",
    "Home Office":  "/homeOffice.png",
    "Bathroom":     "/bathroom.png",
  };

  const img = roomImages[booking.consultationType] || "/livingRoom.png";
  const isPending = booking.status === "pending" || booking.status === "Pending";
  const meetingTime = getMeetingDate(booking);
  const now = Date.now();
  const hasPassed = meetingTime && now >= meetingTime;

  return (
    <div className="bk-card">
      <div className="bk-card-thumb">
        <img src={img} alt={booking.consultationType || "Consultation"} />
      </div>

      <div className="bk-card-body">
        <div className="bk-card-header">
          <h3 className="bk-card-title">
            {booking.consultationType
              ? `${booking.consultationType} Consultation`
              : "Interior Design Consultation"}
          </h3>
          <StatusBadge status={booking.status} hasPassed={hasPassed} />
        </div>

        <div className="bk-card-meta">
          <div className="bk-meta-row">
            <span className="material-symbols-outlined" style={{fontSize:"16px"}}>calendar_today</span>
            <span>
              <strong>Meeting:</strong>{" "}
              {isPending ? "Pending" : (booking.scheduledDateDisplay || fmtDate(booking.scheduledDate) || "TBD")}
              {!isPending && booking.scheduledTime ? ` at ${booking.scheduledTime}` : ""}
            </span>
          </div>
          <div className="bk-meta-row">
            <span className="material-symbols-outlined" style={{fontSize:"16px"}}>person</span>
            <span>
              <strong>Designer:</strong> {isPending ? "Pending" : (booking.designerName || "To be assigned")}
            </span>
          </div>
          {booking.id && (
            <div className="bk-meta-row">
              <span className="material-symbols-outlined" style={{fontSize:"16px"}}>tag</span>
              <span>
                <strong>ID:</strong> {booking.id}
              </span>
            </div>
          )}
        </div>

        <div className="bk-card-actions">
          <button className="bk-view-btn" style={{width: "100%"}} onClick={() => onViewDetails(booking)}>
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────── */
/*  DETAILS MODAL                                                     */
/* ────────────────────────────────────────────────────────────────── */
const DetailsModal = ({ booking, onClose }) => {
  if (!booking) return null;
  const isPending = booking.status === "pending" || booking.status === "Pending";
  const meetingTime = getMeetingDate(booking);
  const now = Date.now();
  const hasPassed = meetingTime && now >= meetingTime;

  return (
    <div className="popup-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="popup-box" style={{ width: '600px', textAlign: 'left', padding: '30px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 20px 0' }}>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#470606' }}>Booking Details</h2>
          <button className="popup-close-btn" onClick={onClose} style={{ position: 'static' }}>✕</button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '15px', color: '#4B4848' }}>
          <div><strong>Booking ID:</strong> <br/>{booking.id}</div>
          <div><strong>Status:</strong> <br/><StatusBadge status={booking.status} hasPassed={hasPassed} /></div>
          
          <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #ccc', margin: '10px 0' }}></div>
          
          <div><strong>Project Type:</strong> <br/>{booking.projectType || "N/A"}</div>
          <div><strong>Property Type:</strong> <br/>{booking.propertyType || "N/A"}</div>
          <div><strong>Space:</strong> <br/>{booking.spaceType || booking.consultationType || "N/A"}</div>
          <div><strong>Dimensions:</strong> <br/>{booking.dimensions || "N/A"}</div>
          <div><strong>Ceiling Height:</strong> <br/>{booking.ceilingHeight || "N/A"}</div>
          <div><strong>Budget:</strong> <br/>{booking.budget || "N/A"}</div>
          <div><strong>Interior Style:</strong> <br/>{booking.interiorStyle || "N/A"}</div>
          <div><strong>Theme:</strong> <br/>{booking.preferredTheme || "N/A"}</div>
          
          <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #ccc', margin: '10px 0' }}></div>

          <div><strong>Confirmed Date:</strong> <br/>{isPending ? "Pending" : (fmtDate(booking.scheduledDate) || "N/A")}</div>
          <div><strong>Confirmed Time:</strong> <br/>{isPending ? "Pending" : (booking.scheduledTime || "N/A")}</div>
          <div><strong>Designer:</strong> <br/>{isPending ? "Pending" : (booking.designerName || "To be assigned")}</div>
          <div><strong>Meeting:</strong> <br/>{isPending ? "N/A" : (booking.meetingUrl ? <a href={booking.meetingUrl} target="_blank" rel="noreferrer" style={{color: '#500606'}}>Google Meet</a> : "Link not ready")}</div>
          
          {booking.description && (
            <div style={{ gridColumn: '1 / -1' }}>
              <strong>Description:</strong> <br/>{booking.description}
            </div>
          )}
        </div>
        
        <div style={{ marginTop: '25px', textAlign: 'center' }}>
          <button className="pop-up-btn" style={{ width: '120px', padding: '10px', background: '#500606', color: '#fff', border: 'none', cursor: 'pointer' }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────── */
/*  EMPTY STATE                                                       */
/* ────────────────────────────────────────────────────────────────── */
const EmptyState = ({ navigate }) => (
  <div className="bk-empty">
    <div className="bk-empty-icon"><span className="material-symbols-outlined" style={{fontSize:"48px"}}>chair</span></div>
    <h3>No Consultations Yet</h3>
    <p>
      Book your first interior design consultation and let our experts
      transform your space into something extraordinary.
    </p>
    <button className="bk-book-btn" onClick={() => navigate("/?consultancy=true")}>
      Book a Consultation
    </button>
  </div>
);

/* ════════════════════════════════════════════════════════════════════
   BOOKINGS PAGE
   ════════════════════════════════════════════════════════════════════ */
const Bookings = () => {
  const navigate  = useNavigate();
  const [user,     setUser]     = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);

  /* ── Auth listener ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  /* ── Load bookings from Firestore ── */
  useEffect(() => {
    if (!user) {
        // Only set loading false if we know there is no user
        const timeout = setTimeout(() => {
            if(!auth.currentUser) setLoading(false);
        }, 1000);
        return () => clearTimeout(timeout);
    }

    // Query global bookings collection and filter locally by user.uid 
    // to avoid strict composite index requirements (or use where clause).
    const q = query(
      collection(db, "bookings"),
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Client side sort
      docs.sort((a, b) => {
        const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return tB - tA; // desc
      });
      setBookings(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching bookings:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleComplete = async (bookingId, skipConfirm = false) => {
    if (!skipConfirm && !window.confirm("Are you sure you want to mark this consultation as completed?")) return;
    
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/complete-booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ bookingId })
      });
      const data = await res.json();
      if (!res.ok) {
        if (!skipConfirm) alert(data.message || "Failed to mark as completed.");
      } else {
        if (!skipConfirm) alert("Booking marked as completed.");
      }
    } catch (err) {
      if (!skipConfirm) alert("An error occurred. Please try again.");
    }
  };

  /* ── Sort ── */
  const sorted = sortBookings(bookings);

  /* ── Find next upcoming (hero) ── */
  const now    = Date.now();
  const hero   = sorted.find(
    (b) => {
      const isPast = getMeetingDate(b) && getMeetingDate(b) < now;
      const isCompleted = b.status === "completed" || b.status === "Completed";
      const isMissed = isPast && (b.status === "Confirmed" || b.status === "confirmed");
      const isCancelled = b.status === "cancelled" || b.status === "Cancelled";
      return !isCompleted && !isMissed && !isCancelled;
    }
  );

  const history = sorted.filter((b) => b.id !== hero?.id);

  /* ────────────────────────────────────────────────────────────── */
  return (
    <div className="bk-page">
      <Navbar />

      <div className="bk-content">
        {/* ── Page header ── */}
        <div className="bk-page-header">
          <h1 className="bk-page-title">My Consultations</h1>
          <p className="bk-page-subtitle">
            Track your interior design consultation sessions
          </p>
          <button
            className="bk-new-btn"
            onClick={() => navigate("/?consultancy=true")}
          >
            + Book New Consultation
          </button>
        </div>

        {loading ? (
          <div className="bk-loading">
            <div className="bk-spinner" />
            <p>Loading your consultations…</p>
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState navigate={navigate} />
        ) : (
          <>
            {/* ── Hero: Next upcoming ── */}
            {hero && (
              <section className="bk-hero-section">
                <h2 className="bk-section-label">
                  {getMeetingDate(hero) > now
                    ? "Upcoming Consultation"
                    : "Latest Consultation"}
                </h2>
                <HeroCard booking={hero} onViewDetails={setSelectedBooking} onComplete={handleComplete} />
              </section>
            )}

            {/* ── History ── */}
            {history.length > 0 && (
              <section className="bk-history-section">
                <h2 className="bk-section-label">All Consultations</h2>
                <div className="bk-history-grid">
                  {history.map((b) => (
                    <SmallCard key={b.id} booking={b} onViewDetails={setSelectedBooking} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <Footer />

      {selectedBooking && (
        <DetailsModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
    </div>
  );
};

export default Bookings;
