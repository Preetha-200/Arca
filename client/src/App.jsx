import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";

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

function App() {
    return (
        <AuthProvider>
            <Routes>
                {/* ── Public Routes ── */}
                <Route path="/"                   element={<Index />} />
                <Route path="/signin"             element={<SignIn />} />
                <Route path="/products/:category" element={<Products />} />
                <Route path="/product/:id"        element={<ProductDetails />} />
                <Route path="/about"              element={<About />} />

                {/* ── Protected Routes ── */}
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
            </Routes>
        </AuthProvider>
    );
}

export default App;