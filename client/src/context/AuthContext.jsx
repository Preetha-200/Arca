import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

/**
 * Wraps the entire app so any component can call useAuth()
 * instead of duplicating onAuthStateChanged listeners.
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(undefined); // undefined = still loading
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    const userDocRef = doc(db, "users", currentUser.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    
                    if (userDocSnap.exists()) {
                        setUserRole(userDocSnap.data().role || "customer");
                    } else {
                        setUserRole("customer"); // Default if no doc exists
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    setUserRole("customer");
                }
                setUser(currentUser);
            } else {
                setUser(null);
                setUserRole(null);
            }
        });
        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, userRole, loading: user === undefined }}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * Hook to access auth state from any component.
 * Returns { user, loading }
 */
export const useAuth = () => useContext(AuthContext);
