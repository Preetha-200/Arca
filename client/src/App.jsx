import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop/ScrollToTop";

/* ── Pages ── */
import Index          from "./pages/index/index";
import SignIn         from "./pages/signin/signin";
import Products       from "./pages/products/products";
import ProductDetails from "./pages/product-details/product-details";
import Account        from "./pages/account/account";
import Wishlist       from "./pages/wishlist/wishlist";
import Bookings       from "./pages/bookings/bookings";
import Orders         from "./pages/orders/orders";
import About          from "./pages/about/about";
import AdminLogin     from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBookings  from "./pages/admin/AdminBookings";

/**
 * Higher Order Component to protect admin routes.
 * Redirects to /admin/login if the user is not authenticated or not an admin.
 */
const AdminRoute = ({ children }) => {
    const { user, userRole, loading } = useAuth();
    
    if (loading) return null; // Or a loader component

    if (!user || userRole !== "admin") {
        return <Navigate to="/admin/login" replace />;
    }

    return children;
};

function App() {
    return (
        <AuthProvider>
            <ScrollToTop />
            <Routes>
                {/* ── Public Routes ── */}
                <Route path="/"                   element={<Index />} />
                <Route path="/signin"             element={<SignIn />} />
                <Route path="/products/:category" element={<Products />} />
                <Route path="/product/:id"        element={<ProductDetails />} />
                <Route path="/about"              element={<About />} />

                {/* ── Protected Customer Routes ── */}
                <Route
                    path="/account"
                    element={
                        <ProtectedRoute>
                            <Account />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/wishlist"
                    element={
                        <ProtectedRoute>
                            <Wishlist />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/bookings"
                    element={
                        <ProtectedRoute>
                            <Bookings />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/orders"
                    element={
                        <ProtectedRoute>
                            <Orders />
                        </ProtectedRoute>
                    }
                />

                {/* ── Admin Routes ── */}
                <Route path="/admin/login" element={<AdminLogin />} />
                
                {/* /admin redirects to dashboard */}
                <Route 
                    path="/admin" 
                    element={
                        <AdminRoute>
                            <Navigate to="/admin/dashboard" replace />
                        </AdminRoute>
                    } 
                />
                
                <Route 
                    path="/admin/dashboard" 
                    element={
                        <AdminRoute>
                            <AdminDashboard />
                        </AdminRoute>
                    } 
                />
                
                <Route 
                    path="/admin/bookings" 
                    element={
                        <AdminRoute>
                            <AdminBookings />
                        </AdminRoute>
                    } 
                />
            </Routes>
        </AuthProvider>
    );
}

export default App;