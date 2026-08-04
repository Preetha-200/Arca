import "./bookings.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, onSnapshot, query, orderBy,
} from "firebase/firestore";
import Navbar  from "../../components/Navbar/Navbar";
import Footer  from "../../components/Footer/Footer";

/* ────────────────────────────────────────────────────────────────── */
/*  UTILITIES                                                         */
/* ────────────────────────────────────────────────────────────────── */

/** Parse "2:00 PM" → 24-h hours, minutes */
const parseTime = (timeStr) => {
  if (!timeStr) return { hours: 10, minutes: 0 };
  const [timePart, ampm] = timeStr.split(" ");
  let [hours, minutes]   = timePart.split(":").map(Number);
  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
};

/** Returns a Date object for a booking's meeting start */
const getMeetingDate = (booking) => {
  if (!booking.scheduledDate) return null;
  const [y, m, d]         = booking.scheduledDate.split("-").map(Number);
  const { hours, minutes } = parseTime(booking.scheduledTime);
  return new Date(y, m - 1, d, hours, minutes, 0);
};

/** Human-readable countdown */
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

/** Sort: upcoming-confirmed → other confirmed → completed → cancelled */
const sortBookings = (list) => {
  const now  = Date.now();
  const rank = (b) => {
    const mt = getMeetingDate(b);
    if (b.status === "Confirmed" && mt && mt > now) return 0;
    if (b.status === "Confirmed") return 1;
    if (b.status === "Completed") return 2;
    return 3; // Cancelled
  };
  return [...list].sort((a, b) => rank(a) - rank(b));
};

/** Format ISO date to readable string */
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
const StatusBadge = ({ status }) => (
  <span className={`bk-badge bk-badge-${(status || "confirmed").toLowerCase()}`}>
    {status || "Confirmed"}
  </span>
);

/* ────────────────────────────────────────────────────────────────── */
/*  HERO BOOKING CARD                                                 */
/* ────────────────────────────────────────────────────────────────── */
const HeroCard = ({ booking, onRebook, navigate }) => {
  const [tick, setTick] = useState(0);

  /* Live countdown tick every minute */
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const countdown   = getCountdown(booking);
  const meetingTime = getMeetingDate(booking);
  const canJoin     = meetingTime && Date.now() >= meetingTime - 5 * 60 * 1000; // 5min early

  const title = booking.consultationType
    ? `${booking.consultationType} Consultation`
    : "Interior Design Consultation";

  return (
    <div className="bhc-card">
      {/* Top row */}
      <div className="bhc-top-row">
        <StatusBadge status={booking.status} />
        {countdown && countdown !== "Meeting passed" && (
          <span className="bhc-countdown">⏳ {countdown}</span>
        )}
      </div>

      {/* Title + ID */}
      <h2 className="bhc-title">{title}</h2>
      <p className="bhc-booking-id">Booking ID: {booking.bookingId || "—"}</p>

      {/* Meta grid */}
      <div className="bhc-meta-grid">
        <div className="bhc-meta-item">
          <span className="bhc-meta-icon">📅</span>
          <div>
            <p className="bhc-meta-label">Scheduled Date</p>
            <p className="bhc-meta-value">
              {booking.scheduledDateDisplay || fmtDate(booking.scheduledDate) || "TBD"}
            </p>
          </div>
        </div>

        <div className="bhc-meta-item">
          <span className="bhc-meta-icon">⏰</span>
          <div>
            <p className="bhc-meta-label">Meeting Time</p>
            <p className="bhc-meta-value">{booking.scheduledTime || "TBD"} IST</p>
          </div>
        </div>

        <div className="bhc-meta-item">
          <span className="bhc-meta-icon">⏱</span>
          <div>
            <p className="bhc-meta-label">Duration</p>
            <p className="bhc-meta-value">{booking.duration || "60 minutes"}</p>
          </div>
        </div>

        <div className="bhc-meta-item">
          <span className="bhc-meta-icon">👤</span>
          <div>
            <p className="bhc-meta-label">Assigned Designer</p>
            <p className="bhc-meta-value">{booking.designerName || "To be assigned"}</p>
          </div>
        </div>

        <div className="bhc-meta-item">
          <span className="bhc-meta-icon">📹</span>
          <div>
            <p className="bhc-meta-label">Meeting Type</p>
            <p className="bhc-meta-value">Google Meet (Virtual)</p>
          </div>
        </div>

        <div className="bhc-meta-item">
          <span className="bhc-meta-icon">🏡</span>
          <div>
            <p className="bhc-meta-label">Consultation Type</p>
            <p className="bhc-meta-value">{booking.consultationType || "Interior Design"}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bhc-actions">
        <button
          className="bhc-view-btn"
          onClick={() =>
            booking.meetingUrl && window.open(booking.meetingUrl, "_blank")
          }
        >
          View Details
        </button>

        <button
          className={`bhc-join-btn ${!canJoin ? "bhc-join-disabled" : ""}`}
          disabled={!canJoin}
          onClick={() =>
            booking.meetingUrl && window.open(booking.meetingUrl, "_blank")
          }
          title={canJoin ? "Join Google Meet" : "Available 5 minutes before the meeting"}
        >
          {canJoin ? "Join Meeting →" : "🔒 Join Meeting"}
        </button>
      </div>

      {!canJoin && booking.status === "Confirmed" && (
        <p className="bhc-join-note">
          The Join Meeting button will be enabled 5 minutes before your scheduled time.
        </p>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────── */
/*  SMALL BOOKING CARD (history)                                     */
/* ────────────────────────────────────────────────────────────────── */
const SmallCard = ({ booking, navigate }) => {
  const roomImages = {
    "Living Room":  "/livingRoom.png",
    "Kitchen":      "/kitchen.png",
    "Bedroom":      "/bedroom.png",
    "Dining Room":  "/dining.png",
    "Home Office":  "/homeOffice.png",
    "Bathroom":     "/bathroom.png",
  };

  const img = roomImages[booking.consultationType] || "/livingRoom.png";

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
          <StatusBadge status={booking.status} />
        </div>

        <div className="bk-card-meta">
          <div className="bk-meta-row">
            <span>📅</span>
            <span>
              <strong>Meeting:</strong>{" "}
              {booking.scheduledDateDisplay || fmtDate(booking.scheduledDate) || "TBD"}
              {booking.scheduledTime ? ` at ${booking.scheduledTime}` : ""}
            </span>
          </div>
          <div className="bk-meta-row">
            <span>📝</span>
            <span>
              <strong>Booked:</strong>{" "}
              {booking.createdAt?.toDate
                ? booking.createdAt.toDate().toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                  })
                : "—"}
            </span>
          </div>
          <div className="bk-meta-row">
            <span>👤</span>
            <span>
              <strong>Designer:</strong> {booking.designerName || "To be assigned"}
            </span>
          </div>
          {booking.bookingId && (
            <div className="bk-meta-row">
              <span>🔖</span>
              <span>
                <strong>ID:</strong> {booking.bookingId}
              </span>
            </div>
          )}
        </div>

        <div className="bk-card-actions">
          {booking.meetingUrl && (
            <button
              className="bk-view-btn"
              onClick={() => window.open(booking.meetingUrl, "_blank")}
            >
              View Details
            </button>
          )}
          <button
            className="bk-rebook-btn"
            onClick={() => navigate("/?consultancy=true")}
          >
            Rebook Consultation
          </button>
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
    <div className="bk-empty-icon">🏡</div>
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

  /* ── Auth listener ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  /* ── Load bookings from Firestore ── */
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "consultancies", user.uid, "bookings"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBookings(docs);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  /* ── Sort ── */
  const sorted = sortBookings(bookings);

  /* ── Find next upcoming (hero) ── */
  const now    = Date.now();
  const hero   = sorted.find(
    (b) => b.status === "Confirmed" && getMeetingDate(b) && getMeetingDate(b) > now
  ) || sorted[0];

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
                <HeroCard booking={hero} navigate={navigate} />
              </section>
            )}

            {/* ── History ── */}
            {history.length > 0 && (
              <section className="bk-history-section">
                <h2 className="bk-section-label">All Consultations</h2>
                <div className="bk-history-grid">
                  {history.map((b) => (
                    <SmallCard key={b.id} booking={b} navigate={navigate} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Bookings;
