import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loader from "../Loader/Loader";

/**
 * ProtectedRoute – wraps a route element and redirects
 * unauthenticated users to /signin.
 *
 * Usage:
 *   <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
 */
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) return <Loader fullPage />;
    if (!user)   return <Navigate to="/signin" replace />;

    return children;
};

export default ProtectedRoute;
