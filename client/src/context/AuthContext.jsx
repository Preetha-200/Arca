import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

const AuthContext = createContext(null);

/**
 * Wraps the entire app so any component can call useAuth()
 * instead of duplicating onAuthStateChanged listeners.
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(undefined); // undefined = still loading

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser ?? null);
        });
        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading: user === undefined }}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * Hook to access auth state from any component.
 * Returns { user, loading }
 */
export const useAuth = () => useContext(AuthContext);
