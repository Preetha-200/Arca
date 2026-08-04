import "./account.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast/Toast";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import Loader from "../../components/Loader/Loader";

const Account = () => {
    const navigate = useNavigate();
    const { user, loading } = useAuth();
    const { showToast, ToastContainer } = useToast();

    const [displayName, setDisplayName] = useState("");
    const [mobile, setMobile]           = useState("");
    const [editMode, setEditMode]       = useState(false);
    const [saving, setSaving]           = useState(false);
    const [resetSent, setResetSent]     = useState(false);

    /* ── Load user data from Firestore ── */
    useEffect(() => {
        if (!user) return;
        setDisplayName(user.displayName || "");
        const fetchProfile = async () => {
            try {
                const snap = await getDoc(doc(db, "users", user.uid));
                if (snap.exists()) {
                    setMobile(snap.data().mobile || "");
                }
            } catch (err) {
                console.error("Failed to load profile:", err);
            }
        };
        fetchProfile();
    }, [user]);

    /* ── Save changes ── */
    const handleSave = async () => {
        if (!displayName.trim() || displayName.trim().length < 2) {
            showToast("Name must be at least 2 characters", "error");
            return;
        }
        if (mobile && !/^[6-9]\d{9}$/.test(mobile)) {
            showToast("Enter a valid 10-digit mobile number", "error");
            return;
        }

        setSaving(true);
        try {
            // Update Firebase Auth display name
            await updateProfile(user, { displayName: displayName.trim() });

            // Upsert Firestore user document
            await setDoc(
                doc(db, "users", user.uid),
                {
                    name:      displayName.trim(),
                    email:     user.email,
                    mobile:    mobile,
                    updatedAt: new Date().toISOString(),
                },
                { merge: true }
            );

            setEditMode(false);
            showToast("Profile updated successfully!", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to save changes. Please try again.", "error");
        }
        setSaving(false);
    };

    /* ── Forgot / Reset password ── */
    const handlePasswordReset = async () => {
        if (!user?.email) return;
        try {
            await sendPasswordResetEmail(auth, user.email);
            setResetSent(true);
            showToast("Password reset email sent!", "success");
        } catch (err) {
            showToast("Failed to send reset email.", "error");
        }
    };

    if (loading) return <Loader fullPage />;

    return (
        <div className="account-root">
            <Navbar />
            <ToastContainer />

            <main className="account-main">
                {/* ── Page Title ── */}
                <div className="account-page-header">
                    <h1>My Account</h1>
                    <p>Manage your personal information and preferences</p>
                </div>

                <div className="account-layout">
                    {/* ── Avatar Card ── */}
                    <div className="account-avatar-card">
                        <div className="account-avatar-circle">
                            {displayName?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <h3>{displayName || "User"}</h3>
                        <p>{user?.email}</p>

                        <div className="account-quick-links">
                            <button onClick={() => navigate("/wishlist")}><span className="material-symbols-outlined" style={{fontSize:"16px",marginRight:"6px"}}>favorite</span>Wishlist</button>
                            <button onClick={() => navigate("/bookings")}><span className="material-symbols-outlined" style={{fontSize:"16px",marginRight:"6px"}}>calendar_today</span>Bookings</button>
                            <button onClick={() => navigate("/orders")}><span className="material-symbols-outlined" style={{fontSize:"16px",marginRight:"6px"}}>list</span>Orders</button>
                        </div>
                    </div>

                    {/* ── Profile Form ── */}
                    <div className="account-form-card">
                        <div className="account-form-header">
                            <h2>Personal Information</h2>
                            {!editMode ? (
                                <button
                                    className="account-edit-btn"
                                    onClick={() => setEditMode(true)}
                                >
                                    Edit Profile
                                </button>
                            ) : (
                                <div className="account-edit-actions">
                                    <button
                                        className="account-cancel-btn"
                                        onClick={() => {
                                            setEditMode(false);
                                            // Reset to saved values
                                            setDisplayName(user.displayName || "");
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="account-save-btn"
                                        onClick={handleSave}
                                        disabled={saving}
                                    >
                                        {saving ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="account-fields">
                            {/* Name */}
                            <div className="account-field">
                                <label>Full Name</label>
                                {editMode ? (
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="Enter your name"
                                        className="account-input"
                                    />
                                ) : (
                                    <span>{displayName || "Not set"}</span>
                                )}
                            </div>

                            {/* Email – never editable, controlled by Firebase Auth */}
                            <div className="account-field">
                                <label>Email Address</label>
                                <span className="account-field-fixed">
                                    {user?.email}
                                    <em className="account-field-note">(cannot be changed here)</em>
                                </span>
                            </div>

                            {/* Mobile */}
                            <div className="account-field">
                                <label>Mobile Number</label>
                                {editMode ? (
                                    <div className="account-mobile-input">
                                        <span className="account-country-code">+91</span>
                                        <input
                                            type="text"
                                            value={mobile}
                                            onChange={(e) =>
                                                setMobile(
                                                    e.target.value
                                                        .replace(/\D/g, "")
                                                        .slice(0, 10)
                                                )
                                            }
                                            placeholder="10-digit mobile number"
                                            className="account-input-mobile"
                                        />
                                    </div>
                                ) : (
                                    <span>{mobile ? `+91 ${mobile}` : "Not added"}</span>
                                )}
                            </div>
                        </div>

                        {/* ── Security Section ── */}
                        <div className="account-security">
                            <h2>Security</h2>
                            <div className="account-security-row">
                                <div>
                                    <p className="account-security-label">Password</p>
                                    <p className="account-security-sub">
                                        {resetSent
                                            ? "Reset link sent to your email"
                                            : "Send a password reset link to your email"}
                                    </p>
                                </div>
                                <button
                                    className="account-reset-btn"
                                    onClick={handlePasswordReset}
                                    disabled={resetSent}
                                >
                                    {resetSent ? "Sent" : "Reset Password"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Account;
