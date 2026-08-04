import "./Navbar.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../SearchBar/SearchBar";
import { auth, db } from "../../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";

function Navbar() {
    const navigate = useNavigate();
    const [user,            setUser]            = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [wishlistCount,   setWishlistCount]   = useState(0);
    const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false);

    /* ── Auth listener ── */
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsub();
    }, []);


    /* ── Wishlist count badge ── */
    useEffect(() => {
        if (!user) { setWishlistCount(0); return; }
        const unsub = onSnapshot(
            collection(db, "wishlist", user.uid, "items"),
            (snap) => setWishlistCount(snap.size)
        );
        return () => unsub();
    }, [user]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setShowProfileMenu(false);
            setMobileMenuOpen(false);
            navigate("/");
        } catch (error) {
            console.log(error);
        }
    };

    const closeAll = () => {
        setShowProfileMenu(false);
        setMobileMenuOpen(false);
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
                    {/* Wishlist icon */}
                    {user && (
                        <div
                            className="nav-icon-btn"
                            onClick={() => navigate("/wishlist")}
                            title="Wishlist"
                        >
                        <span className="material-symbols-outlined nav-wishlist-icon">favorite</span>
                            {wishlistCount > 0 && (
                                <span className="nav-badge">{wishlistCount}</span>
                            )}
                        </div>
                    )}

                    {/* Bookings icon */}
                    {user && (
                        <div
                            className="nav-icon-btn"
                            onClick={() => navigate("/bookings")}
                            title="My Bookings"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                        </div>
                    )}

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
                            className="signin-btn"
                            onClick={() => navigate("/signin")}
                        >
                            Sign In
                        </button>
                    )}

                    {/* Mobile hamburger */}
                    <button
                        className="navbar-hamburger"
                        onClick={() => setMobileMenuOpen((v) => !v)}
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen
                            ? <span className="material-symbols-outlined">close</span>
                            : <span className="material-symbols-outlined">menu</span>
                        }
                    </button>
                </div>
            </nav>

            {/* ─── MOBILE MENU ─── */}
            {mobileMenuOpen && (
                <div className="navbar-mobile-menu">
                    <span onClick={() => { navigate("/"); closeAll(); }}>Home</span>
                    <span onClick={() => { navigate("/about"); closeAll(); }}>About</span>
                    <span onClick={() => { navigate("/products/living-room"); closeAll(); }}>Living Rooms</span>
                    <span onClick={() => { navigate("/products/bedroom"); closeAll(); }}>Bedrooms</span>
                    <span onClick={() => { navigate("/products/kitchen"); closeAll(); }}>Kitchens</span>
                    <span onClick={() => { navigate("/products/dining-room"); closeAll(); }}>Dining Areas</span>
                    <span onClick={() => { navigate("/products/home-office"); closeAll(); }}>Home Office</span>
                    <span onClick={() => { navigate("/products/bathroom"); closeAll(); }}>Bathrooms</span>
                    {user ? (
                        <>
                            <span onClick={() => { navigate("/account"); closeAll(); }}>Account</span>
                            <span onClick={() => { navigate("/wishlist"); closeAll(); }}>Wishlist</span>
                            <span onClick={() => { navigate("/bookings"); closeAll(); }}>My Bookings</span>
                            <span onClick={() => { navigate("/orders"); closeAll(); }}>Orders</span>
                            <span className="mobile-logout" onClick={handleLogout}>Logout</span>
                        </>
                    ) : (
                        <span onClick={() => { navigate("/signin"); closeAll(); }}>Sign In</span>
                    )}
                </div>
            )}

            {/* ─── PROFILE DRAWER ─── */}
            {user && (
                <>
                    {/* overlay */}
                    <div
                        className={`profile-overlay ${showProfileMenu ? "active" : ""}`}
                        onClick={() => setShowProfileMenu(false)}
                    />

                    {/* drawer */}
                    <div className={`profile-drawer ${showProfileMenu ? "open" : ""}`}>
                        <div className="drawer-header">
                            <div className="drawer-profile-circle">
                                {user.displayName?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <h2>{user.displayName || "User"}</h2>
                            <p>{user.email}</p>
                        </div>

                        <div className="drawer-options">
                            <button onClick={() => { navigate("/account"); closeAll(); }}>
                                View Profile
                            </button>
                            <button onClick={() => { navigate("/wishlist"); closeAll(); }}>
                                Wishlist{wishlistCount > 0 && ` (${wishlistCount})`}
                            </button>
                            <button onClick={() => { navigate("/bookings"); closeAll(); }}>
                                My Bookings
                            </button>
                            <button onClick={() => { navigate("/orders"); closeAll(); }}>
                                My Orders
                            </button>
                            <button
                                className="logout-drawer-btn"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

export default Navbar;