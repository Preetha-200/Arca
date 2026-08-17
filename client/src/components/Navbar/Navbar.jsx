import "./Navbar.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../SearchBar/SearchBar";
import { auth } from "../../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useAuth } from "../../context/AuthContext";

function Navbar() {
    const navigate = useNavigate();
    const { userRole } = useAuth();
    const [user,            setUser]            = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    /* ── Auth listener ── */
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsub();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setShowProfileMenu(false);
            navigate("/");
        } catch (error) {
        }
    };

    const closeAll = () => {
        setShowProfileMenu(false);
    };

    return (
        <>
            {/* ─── NAVBAR ─── */}
            <nav className="navbar">
                {/* Left: Logo */}
                <div className="navbar-left" onClick={() => navigate("/")}>
                    <img src="/logo-1.png" alt="logo" />
                    <h1>ARCA</h1>
                </div>

                {/* Centre: Smart Search Bar */}
                <SearchBar user={user} />

                {/* Right: Icons + Auth */}
                <div className="navbar-right">
                    {user ? (
                        <div className="profile-wrapper">
                            <div
                                className="profile-circle"
                                onClick={() => setShowProfileMenu(true)}
                            >
                                {user.displayName?.charAt(0).toUpperCase() || "?"}
                            </div>
                        </div>
                    ) : (
                        <button
                            className="hamburger-btn"
                            onClick={() => setShowProfileMenu(true)}
                        >
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                    )}
                </div>
            </nav>

            {/* ─── PROFILE DRAWER ─── */}
            <>
                {/* overlay */}
                <div
                    className={`profile-overlay ${showProfileMenu ? "active" : ""}`}
                    onClick={() => setShowProfileMenu(false)}
                />

                {/* drawer */}
                <div className={`profile-drawer ${showProfileMenu ? "open" : ""}`}>
                    <div className="drawer-header">
                        <button className="drawer-close-btn" onClick={() => setShowProfileMenu(false)}>
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <div className="drawer-profile-circle">
                            {user ? (
                                user.displayName?.charAt(0).toUpperCase() || "?"
                            ) : (
                                <span className="material-symbols-outlined" style={{ fontSize: "50px" }}>person</span>
                            )}
                        </div>
                        <h2>{user ? (user.displayName || "User") : "Guest"}</h2>
                        <p 
                            onClick={() => { if (!user) { navigate("/signin"); closeAll(); } }}
                            style={!user ? { cursor: "pointer", color: "#470606", fontWeight: "bold" } : {}}
                        >
                            {user ? user.email : "Sign In"}
                        </p>
                    </div>

                    <div className="drawer-options">
                        <button onClick={() => { navigate("/account"); closeAll(); }}>
                            View Profile
                        </button>
                        <button onClick={() => { navigate("/wishlist"); closeAll(); }}>
                            Wishlist
                        </button>
                        <button onClick={() => { navigate("/bookings"); closeAll(); }}>
                            My Bookings
                        </button>
                        <button onClick={() => { navigate("/orders"); closeAll(); }}>
                            My Orders
                        </button>
                        {userRole === "admin" && (
                            <button onClick={() => { navigate("/admin/dashboard"); closeAll(); }} style={{color: "#470606", fontWeight: "bold"}}>
                                Admin Dashboard
                            </button>
                        )}
                        
                        {user ? (
                            <button
                                className="logout-drawer-btn"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        ) : (
                            <button
                                className="logout-drawer-btn"
                                onClick={() => { navigate("/signin"); closeAll(); }}
                            >
                                Register
                            </button>
                        )}
                    </div>
                </div>
            </>
        </>
    );
}

export default Navbar;
