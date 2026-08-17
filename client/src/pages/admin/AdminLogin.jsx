import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import { useToast } from "../../components/Toast/Toast";
import "../signin/signin.css"; // Reuse existing signin styles

const AdminLogin = () => {
    const navigate = useNavigate();
    const { user, userRole, loading } = useAuth();
    const { showToast, ToastContainer } = useToast();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // If already logged in and role is admin, redirect to dashboard
    useEffect(() => {
        if (!loading && user) {
            if (userRole === "admin") {
                navigate("/admin/dashboard", { replace: true });
            } else if (userRole === "customer") {
                // If a normal customer stumbles here and is already logged in, redirect home
                navigate("/", { replace: true });
            }
        }
    }, [user, userRole, loading, navigate]);

    const handleAdminSignIn = async () => {
        if (!email || !password) {
            showToast("Please enter email and password", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            // Immediately check role in Firestore before proceeding
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists() && userDoc.data().role === "admin") {
                navigate("/admin/dashboard");
            } else {
                // Not an admin. Sign them back out and show error.
                await signOut(auth);
                showToast("Access Denied: You do not have admin privileges.", "error");
            }
        } catch (err) {
            showToast(
                err.code === "auth/invalid-credential"
                    ? "Incorrect email or password"
                    : err.message,
                "error"
            );
        }
        setIsSubmitting(false);
    };

    const onKeyDown = (e) => {
        if (e.key === "Enter") handleAdminSignIn();
    };

    if (loading) return null; // Wait for auth state

    return (
        <section id="signin-page">
            <Navbar />
            <ToastContainer />

            <div className="signin-page">
                <div className="signin-card">
                    <h1>ARCA Admin</h1>
                    <p className="signin-forgot-sub" style={{ marginBottom: "20px" }}>
                        Secure access for authorized personnel only.
                    </p>

                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Admin Email Address"
                    />

                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Password"
                    />

                    <button
                        className="continue-btn"
                        onClick={handleAdminSignIn}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Authenticating..." : "Admin Login"}
                    </button>
                </div>
            </div>

            <Footer />
        </section>
    );
};

export default AdminLogin;
