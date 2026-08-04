import "./signin.css";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import { useToast } from "../../components/Toast/Toast";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
} from "firebase/auth";
import { db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";

const SignIn = () => {
    const navigate = useNavigate();
    const { showToast, ToastContainer } = useToast();

    const [mode, setMode]             = useState("signin"); // "signin" | "signup" | "forgot"
    const [name, setName]             = useState("");
    const [email, setEmail]           = useState("");
    const [password, setPassword]     = useState("");
    const [confirmPwd, setConfirmPwd] = useState("");
    const [loading, setLoading]       = useState(false);
    const [errors, setErrors]         = useState({});

    /* Redirect already-logged-in users away */
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            if (u) navigate("/", { replace: true });
        });
        return () => unsub();
    }, [navigate]);

    /* ── Validation ── */
    const validate = () => {
        const errs = {};
        if (mode === "signup" && name.trim().length < 2)
            errs.name = "Name must be at least 2 characters";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            errs.email = "Enter a valid email address";
        if (mode !== "forgot" && password.length < 6)
            errs.password = "Password must be at least 6 characters";
        if (mode === "signup" && password !== confirmPwd)
            errs.confirmPwd = "Passwords do not match";
        return errs;
    };

    /* ── Sign In ── */
    const handleSignIn = async () => {
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setErrors({});
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/");
        } catch (err) {
            showToast(
                err.code === "auth/invalid-credential"
                    ? "Incorrect email or password"
                    : err.message,
                "error"
            );
        }
        setLoading(false);
    };

    /* ── Sign Up ── */
    const handleSignUp = async () => {
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setErrors({});
        setLoading(true);
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(cred.user, { displayName: name.trim() });
            // Bootstrap Firestore user doc
            await setDoc(doc(db, "users", cred.user.uid), {
                name:      name.trim(),
                email:     email,
                mobile:    "",
                createdAt: new Date().toISOString(),
            });
            navigate("/");
        } catch (err) {
            showToast(
                err.code === "auth/email-already-in-use"
                    ? "An account with this email already exists"
                    : err.message,
                "error"
            );
        }
        setLoading(false);
    };

    /* ── Forgot Password ── */
    const handleForgotPassword = async () => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setErrors({ email: "Enter a valid email address" });
            return;
        }
        setErrors({});
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            showToast("Password reset link sent to your email!", "success");
            setMode("signin");
        } catch (err) {
            showToast("Failed to send reset email. Check the address and try again.", "error");
        }
        setLoading(false);
    };

    /* ── Google Sign In ── */
    const handleGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result   = await signInWithPopup(auth, provider);
            // Ensure user doc exists for Google users
            const u = result.user;
            await setDoc(
                doc(db, "users", u.uid),
                {
                    name:      u.displayName || "",
                    email:     u.email || "",
                    mobile:    "",
                    createdAt: new Date().toISOString(),
                },
                { merge: true }
            );
            navigate("/");
        } catch (err) {
            showToast("Google sign-in failed. Please try again.", "error");
        }
    };

    /* ── Submit dispatcher ── */
    const handleSubmit = () => {
        if (mode === "signin")  handleSignIn();
        if (mode === "signup")  handleSignUp();
        if (mode === "forgot")  handleForgotPassword();
    };

    /* ── Key-enter submit ── */
    const onKeyDown = (e) => { if (e.key === "Enter") handleSubmit(); };

    return (
        <section id="signin-page">
            <Navbar />
            <ToastContainer />

            <div className="signin-page">
                <div className="signin-card">
                    <h1>ARCA</h1>

                    {/* ── Tab Toggle ── */}
                    {mode !== "forgot" && (
                        <div className="auth-toggle">
                            <button
                                className={mode === "signin" ? "active-tab" : ""}
                                onClick={() => { setMode("signin"); setErrors({}); }}
                            >
                                Sign In
                            </button>
                            <button
                                className={mode === "signup" ? "active-tab" : ""}
                                onClick={() => { setMode("signup"); setErrors({}); }}
                            >
                                Create Account
                            </button>
                        </div>
                    )}

                    {/* ── Forgot Password header ── */}
                    {mode === "forgot" && (
                        <div className="signin-forgot-header">
                            <p className="signin-forgot-title">Reset Password</p>
                            <p className="signin-forgot-sub">
                                Enter your account email and we'll send a reset link.
                            </p>
                        </div>
                    )}

                    {/* ── Name (signup only) ── */}
                    {mode === "signup" && (
                        <>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={onKeyDown}
                                placeholder="Full Name"
                                className={errors.name ? "input-error" : ""}
                            />
                            {errors.name && <p className="signin-error">{errors.name}</p>}
                        </>
                    )}

                    {/* ── Email ── */}
                    <>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder="Email Address"
                            className={errors.email ? "input-error" : ""}
                        />
                        {errors.email && <p className="signin-error">{errors.email}</p>}
                    </>

                    {/* ── Password ── */}
                    {mode !== "forgot" && (
                        <>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={onKeyDown}
                                placeholder="Password"
                                className={errors.password ? "input-error" : ""}
                            />
                            {errors.password && <p className="signin-error">{errors.password}</p>}
                        </>
                    )}

                    {/* ── Confirm Password (signup only) ── */}
                    {mode === "signup" && (
                        <>
                            <input
                                type="password"
                                value={confirmPwd}
                                onChange={(e) => setConfirmPwd(e.target.value)}
                                onKeyDown={onKeyDown}
                                placeholder="Confirm Password"
                                className={errors.confirmPwd ? "input-error" : ""}
                            />
                            {errors.confirmPwd && (
                                <p className="signin-error">{errors.confirmPwd}</p>
                            )}
                        </>
                    )}

                    {/* ── Forgot password link (sign-in mode) ── */}
                    {mode === "signin" && (
                        <button
                            className="signin-forgot-link"
                            onClick={() => { setMode("forgot"); setErrors({}); }}
                        >
                            Forgot password?
                        </button>
                    )}

                    {/* ── Primary action ── */}
                    <button
                        className="continue-btn"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading
                            ? "Please wait..."
                            : mode === "signin"
                            ? "Sign In"
                            : mode === "signup"
                            ? "Create Account"
                            : "Send Reset Link"}
                    </button>

                    {/* ── Back to sign-in (forgot mode) ── */}
                    {mode === "forgot" && (
                        <button
                            className="signin-back-btn"
                            onClick={() => { setMode("signin"); setErrors({}); }}
                        >
                            ← Back to Sign In
                        </button>
                    )}

                    {/* ── Google (not in forgot mode) ── */}
                    {mode !== "forgot" && (
                        <>
                            <div className="divider">or</div>
                            <button className="google-btn" onClick={handleGoogle}>
                                <svg width="18" height="18" viewBox="0 0 18 18" style={{marginRight:8,verticalAlign:"middle"}}>
                                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                                    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                                </svg>
                                Continue with Google
                            </button>
                        </>
                    )}
                </div>
            </div>

            <Footer />
        </section>
    );
};

export default SignIn;