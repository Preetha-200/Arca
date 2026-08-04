import "./index.css";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, db } from "../../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    collection, addDoc, doc, getDoc, setDoc, serverTimestamp,
} from "firebase/firestore";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import API_BASE from "../../api";

const CONSULTATION_TYPES = [
    "Living Room",
    "Bedroom",
    "Kitchen",
    "Dining Room",
    "Home Office",
    "Bathroom",
    "Full Home",
];

/* ─────────────────────────────────────────────────────────────────
   Fetch or initialise the user's profile document from Firestore.
   Returns the mobile number (or "") from the users collection.
   ───────────────────────────────────────────────────────────────── */
const fetchUserProfile = async (uid) => {
    try {
        const ref  = doc(db, "users", uid);
        const snap = await getDoc(ref);
        if (snap.exists()) return snap.data();
    } catch (err) {
        console.warn("fetchUserProfile error:", err);
    }
    return null;
};

/* ─────────────────────────────────────────────────────────────────
   Upsert the user's profile document in Firestore.
   Uses setDoc with merge:true so we never overwrite existing data.
   ───────────────────────────────────────────────────────────────── */
const upsertUserProfile = async (uid, data) => {
    try {
        await setDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
        console.warn("upsertUserProfile error:", err);
    }
};

/* ═══════════════════════════════════════════════════════════════════
   INDEX PAGE
   ═══════════════════════════════════════════════════════════════════ */
const Index = () => {
    const navigate       = useNavigate();
    const [searchParams] = useSearchParams();
    const consultancyRef = useRef(null);

    /* ── Core user state ── */
    const [user,             setUser]             = useState(null);

    /* ── Form fields ── */
    const [name,             setName]             = useState("");
    const [email,            setEmail]            = useState("");
    const [mobile,           setMobile]           = useState("");
    const [city,             setCity]             = useState("");
    const [consultationType, setConsultationType] = useState("");

    /* ── UI state ── */
    const [loading,          setLoading]          = useState(false);
    const [showPopup,        setShowPopup]        = useState(false);
    const [bookingId,        setBookingId]        = useState("");

    /* ── Guest-only OTP state ── */
    const [otp,              setOtp]              = useState("");
    const [otpSent,          setOtpSent]          = useState(false);
    const [verified,         setVerified]         = useState(false);
    const [otpClicked,       setOtpClicked]       = useState(false);

    /* ── Validation errors ── */
    const [nameError,        setNameError]        = useState("");
    const [emailError,       setEmailError]       = useState("");
    const [mobileError,      setMobileError]      = useState("");

    /* ── Whether mobile was pre-filled from Firestore (editable, but tracked) ── */
    const [mobilePrefilled,  setMobilePrefilled]  = useState(false);

    /* ─────────────────────────────────────────────────────────────
       AUTH LISTENER
       - Logged-in  → autofill name/email from Firebase Auth,
                       fetch mobile from Firestore users/{uid},
                       mark email as already verified (no OTP needed)
       - Logged-out → reset all fields to empty
       ───────────────────────────────────────────────────────────── */
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                /* Autofill from Firebase Auth */
                setName(currentUser.displayName || "");
                setEmail(currentUser.email || "");

                /* Mark as verified — OTP section will never render */
                setVerified(true);
                setOtp("");
                setOtpSent(false);
                setOtpClicked(true);

                /* Fetch mobile from Firestore users/{uid} */
                const profile = await fetchUserProfile(currentUser.uid);
                const savedMobile = profile?.mobile || localStorage.getItem("userMobile") || "";
                setMobile(savedMobile);
                if (savedMobile) setMobilePrefilled(true);
            } else {
                /* Guest → clear everything */
                setName("");
                setEmail("");
                setMobile("");
                setMobilePrefilled(false);
                setVerified(false);
                setOtp("");
                setOtpSent(false);
                setOtpClicked(false);
            }
        });

        return () => unsubscribe();
    }, []);

    /* ─────────────────────────────────────────────────────────────
       URL PARAMS
       ?consultancy=true → smooth-scroll to the form
       ?room=<type>      → pre-select consultation type
       ───────────────────────────────────────────────────────────── */
    useEffect(() => {
        const roomParam    = searchParams.get("room");
        const scrollToForm = searchParams.get("consultancy") === "true";

        if (roomParam) {
            const decoded = decodeURIComponent(roomParam);
            const matched = CONSULTATION_TYPES.find(
                (t) => t.toLowerCase() === decoded.toLowerCase()
            );
            if (matched) setConsultationType(matched);
        }

        if (scrollToForm) {
            setTimeout(() => {
                consultancyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 300);
        }
    }, [searchParams]);

    /* ─────────────────────────────────────────────────────────────
       GUEST-ONLY: Send / Verify OTP
       ───────────────────────────────────────────────────────────── */
    const sendOtp = async () => {
        try {
            const res  = await fetch(`${API_BASE}/send-otp`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ email }),
            });
            const data = await res.json();
            if (res.ok) {
                setOtpSent(true);
                setOtpClicked(true);
                alert("OTP sent to your email");
            } else {
                alert(data.message);
            }
        } catch {
            alert("Failed to send OTP. Please check your connection.");
        }
    };

    const verifyOtp = async () => {
        try {
            const res  = await fetch(`${API_BASE}/verify-otp`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ email, otp }),
            });
            const data = await res.json();
            if (data.verified) {
                setVerified(true);
                alert("Email verified successfully");
            } else {
                alert(data.message || "Invalid OTP");
            }
        } catch {
            alert("OTP verification failed. Please try again.");
        }
    };

    /* ─────────────────────────────────────────────────────────────
       VALIDATION HELPERS (unchanged)
       ───────────────────────────────────────────────────────────── */
    const validateName = (value) => {
        const trimmed   = value.trim();
        const fakeNames = ["abc", "xyz", "test", "name", "user", "dummy", "asdf"];
        if (trimmed.length < 3)                        return "Name must be at least 3 characters";
        if (!/^[A-Za-z ]+$/.test(trimmed))            return "Only letters and spaces allowed";
        if (fakeNames.includes(trimmed.toLowerCase())) return "Please enter a valid name";
        return "";
    };

    const validateEmail = (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return "Please enter a valid email";
        return "";
    };

    const validateMobile = (value) => {
        if (!/^[6-9]\d{9}$/.test(value)) return "Enter a valid 10-digit mobile number";
        return "";
    };

    /* ─────────────────────────────────────────────────────────────
       BOOK CONSULTANCY HANDLER
       - Logged-in  → no OTP call on this side (server uses
                       the verifiedEmails store; we bypass by
                       sending the request directly, but the
                       server's guard is on email-OTP for guests.
                       For Firebase-authenticated users the server
                       allows the booking if they pass the check.
                       We use a bypass flag in the request body.
       ───────────────────────────────────────────────────────────── */
    const handleBookConsultancy = async () => {
        setLoading(true);

        try {
            const currentUser = auth.currentUser;
            const isLoggedIn  = !!currentUser;

            const response = await fetch(`${API_BASE}/book-consultancy`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    name,
                    email,
                    mobile,
                    city,
                    consultationType,
                    /* Signals server to skip OTP gate for authenticated users */
                    firebaseAuthenticated: isLoggedIn,
                    userId:                currentUser?.uid || null,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                const { booking } = data;

                if (isLoggedIn) {
                    /* ── Update user profile in Firestore (upsert) ── */
                    await upsertUserProfile(currentUser.uid, {
                        name,
                        email,
                        mobile,
                        photoURL: currentUser.photoURL || "",
                    });

                    /* Persist mobile for future sessions */
                    if (mobile) localStorage.setItem("userMobile", mobile);

                    /* ── Save rich booking to Firestore ── */
                    try {
                        await addDoc(
                            collection(db, "consultancies", currentUser.uid, "bookings"),
                            {
                                userId:               currentUser.uid,
                                name,
                                email,
                                mobile,
                                city,
                                consultationType:     booking?.consultationType || consultationType || "Interior Design",
                                bookingId:            booking?.bookingId            || "",
                                bookingDate:          new Date().toISOString(),
                                scheduledDate:        booking?.scheduledDate        || "",
                                scheduledDateDisplay: booking?.scheduledDateDisplay || "",
                                scheduledTime:        booking?.scheduledTime        || "",
                                designerName:         booking?.designerName         || "",
                                meetingUrl:           booking?.meetingUrl            || "",
                                duration:             booking?.duration              || "60 minutes",
                                meetingType:          booking?.meetingType           || "Google Meet (Virtual)",
                                status:               booking?.status                || "Confirmed",
                                createdAt:            serverTimestamp(),
                            }
                        );
                    } catch (fsErr) {
                        console.warn("Firestore booking save failed (non-critical):", fsErr);
                    }
                }

                setBookingId(booking?.bookingId || "");
                setShowPopup(true);

                /* ── Reset form ── */
                setCity("");
                setConsultationType("");
                setOtp("");
                setOtpSent(false);

                if (isLoggedIn) {
                    /* Keep name/email filled from Firebase; only clear mutable fields */
                    /* Mobile stays so the user doesn't have to re-enter it */
                } else {
                    setName("");
                    setEmail("");
                    setMobile("");
                    setVerified(false);
                }
            } else {
                alert(data.message || "Booking failed. Please try again.");
            }
        } catch (error) {
            console.error(error);
            alert("Booking failed. Please try again.");
        }

        setLoading(false);
    };

    /* ─────────────────────────────────────────────────────────────
       BOOKING BUTTON DISABLED LOGIC
       Logged-in  → OTP not required; need name, email, mobile, city
       Guest      → must also have verified OTP
       ───────────────────────────────────────────────────────────── */
    const isButtonDisabled = () => {
        const baseFieldsMissing =
            !name || !email || !mobile || !city ||
            !!nameError || !!emailError || !!mobileError ||
            loading;

        if (user) {
            /* Authenticated: OTP not required */
            return baseFieldsMissing;
        }
        /* Guest: must have verified OTP */
        return baseFieldsMissing || !verified;
    };

    /* ═════════════════════════════════════════════════════════════
       RENDER
       ═════════════════════════════════════════════════════════════ */
    return (
        <div className="home">
            <Navbar />

            {/* ──────────── HERO ──────────── */}
            <section className="hero">
                <div className="hero-overlay" />
                <img src="/logo.png" alt="logo" />
                <h1>ARCA</h1>
                <h2>Designed for the Exceptional</h2>
                <button
                    className="hero-btn"
                    onClick={() =>
                        document.getElementById("designs").scrollIntoView({
                            behavior: "smooth",
                            block:    "start",
                        })
                    }
                >
                    View designs
                </button>
            </section>

            {/* ──────────── DESIGNS ──────────── */}
            <section className="designs">
                <div className="h2" id="designs">
                    <p>OUR DESIGNS</p>
                </div>

                <div className="grid">
                    <div onClick={() => navigate("/products/living-room")}>
                        <img src="/livingRoom.png" alt="Living Room" />
                        <p>Living Rooms</p>
                    </div>
                    <div onClick={() => navigate("/products/kitchen")}>
                        <img src="/kitchen.png" alt="Kitchen" />
                        <p>Kitchens</p>
                    </div>
                    <div onClick={() => navigate("/products/dining-room")}>
                        <img src="/dining.png" alt="Dining" />
                        <p>Dining Area</p>
                    </div>
                    <div onClick={() => navigate("/products/home-office")}>
                        <img src="/homeOffice.png" alt="Office" />
                        <p>Home Office</p>
                    </div>
                    <div onClick={() => navigate("/products/bedroom")}>
                        <img src="/bedroom.png" alt="Bedroom" />
                        <p>Bedrooms</p>
                    </div>
                    <div onClick={() => navigate("/products/bathroom")}>
                        <img src="/bathroom.png" alt="Bathroom" />
                        <p>Bathrooms</p>
                    </div>
                </div>
            </section>

            {/* ──────────── CONSULTANCY ──────────── */}
            <section className="consultancy" ref={consultancyRef} id="consultancy-form">
                <div className="text">
                    <h2>Your vision, architecturally defined.</h2>
                    <p>
                        Skip the confusion of layouts and costs. Our 3D design sessions
                        allow you to walk through your future home before construction.
                    </p>
                </div>

                <div className="form">
                    <h3>Meet a designer</h3>

                    {/* ── Signed-in user greeting ── */}
                    {user && user.photoURL && (
                        <div className="user-greeting">
                            <img
                                src={user.photoURL}
                                alt={user.displayName || "Profile"}
                                className="user-greeting-avatar"
                                referrerPolicy="no-referrer"
                            />
                            <span className="user-greeting-name">
                                Hello, {user.displayName?.split(" ")[0] || "there"}
                            </span>
                        </div>
                    )}

                    {/* ── Name ── */}
                    <input
                        type="text"
                        placeholder="Enter your Name"
                        value={name}
                        disabled={!!user}
                        onChange={(e) => {
                            const value = e.target.value;
                            setName(value);
                            setNameError(validateName(value));
                        }}
                    />
                    {nameError && <p className="error-text">{nameError}</p>}

                    {/* ── Email + OTP (OTP shown only for guests) ── */}
                    <div className="email-input-wrapper">
                        <input
                            type="email"
                            placeholder="Enter your Email"
                            value={email}
                            disabled={!!user}
                            onChange={(e) => {
                                const value = e.target.value;
                                setEmail(value);
                                setEmailError(validateEmail(value));
                                setOtpClicked(false);
                                if (verified) {
                                    setVerified(false);
                                    setOtp("");
                                    setOtpSent(false);
                                }
                            }}
                        />
                        {/* Send OTP — guests only */}
                        {!user && !verified && (
                            <button type="button" className="send-otp-btn" onClick={sendOtp}>
                                {otpSent ? "Resend" : "Send OTP"}
                            </button>
                        )}
                        {user && (
                            <span className="email-verified-tick" title="Verified via Firebase">
                                <span className="material-symbols-outlined" style={{fontSize:"18px",color:"#2e7d32"}}>verified</span>
                            </span>
                        )}
                    </div>

                    {/* Email errors + OTP hint — guests only */}
                    {!user && emailError && <p className="error-text">{emailError}</p>}
                    {!user && email && !emailError && !verified && !otpClicked && (
                        <p className="error-text">Please verify your email</p>
                    )}

                    {/* OTP input row — guests only, after OTP is sent */}
                    {!user && otpSent && !verified && (
                        <div className="otp-input-wrapper">
                            <input
                                type="text"
                                placeholder="Enter OTP"
                                value={otp}
                                onChange={(e) =>
                                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                                }
                            />
                            <button type="button" className="verify-otp" onClick={verifyOtp}>
                                Verify
                            </button>
                        </div>
                    )}

                    {/* ── Mobile ── */}
                    <div className="mobile-input">
                        <div className="country-code">
                            <span>+91</span>
                        </div>
                        <input
                            type="text"
                            placeholder="Enter your Mobile number"
                            value={mobile}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                                setMobile(value);
                                setMobileError(validateMobile(value));
                            }}
                        />
                    </div>
                    {mobileError && <p className="error-text">{mobileError}</p>}
                    {/* Hint when mobile is pre-filled */}
                    {user && mobilePrefilled && !mobileError && (
                        <p className="info-text">Mobile number pre-filled from your profile — edit if needed.</p>
                    )}

                    {/* ── City ── */}
                    <select value={city} onChange={(e) => setCity(e.target.value)}>
                        <option value="">Select your property city</option>
                        <option>Chennai</option>
                        <option>Madurai</option>
                        <option>Coimbatore</option>
                        <option>Bangalore</option>
                    </select>

                    {/* ── Consultation Type ── */}
                    <select
                        value={consultationType}
                        onChange={(e) => setConsultationType(e.target.value)}
                    >
                        <option value="">Select consultation type</option>
                        {CONSULTATION_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>

                    {/* ── Book Button ── */}
                    <button
                        className="booking-btn"
                        onClick={handleBookConsultancy}
                        disabled={isButtonDisabled()}
                    >
                        {loading ? "Booking..." : "Book Consultancy"}
                    </button>
                </div>
            </section>

            {/* ──────────── SUCCESS POPUP ──────────── */}
            {showPopup && (
                <div className="popup-overlay">
                    <div className="popup-box">
                        <h2>Consultation Booked!</h2>
                        <p>
                            Your consultation has been confirmed.
                            <br />
                            {bookingId && (
                                <>
                                    Booking ID: <strong>{bookingId}</strong>
                                    <br />
                                </>
                            )}
                            Check your email for full details including your meeting link
                            and scheduled time.
                        </p>
                        {auth.currentUser && (
                            <button
                                className="pop-up-btn"
                                style={{ marginBottom: "8px" }}
                                onClick={() => { setShowPopup(false); navigate("/bookings"); }}
                            >
                                View My Bookings
                            </button>
                        )}
                        <button className="pop-up-btn" onClick={() => setShowPopup(false)}>
                            Okay
                        </button>
                    </div>
                </div>
            )}

            {/* ──────────── FOOTER ──────────── */}
            <Footer />
        </div>
    );
};

export default Index;