import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const ref = doc(db, "users", currentUser.uid);
          const snap = await getDoc(ref);
          
          if (snap.exists()) {
            const userData = snap.data();
            // On crée un objet utilisateur "augmenté" avec ses infos Firestore
            setUser({
              uid: currentUser.uid,
              email: currentUser.email,
              adminId: userData.adminId, // ID de la boutique
              shopName: userData.shopName,
              ...userData
            });
            setRole(userData.role);
          } else {
            setUser(currentUser);
          }
        } catch (error) {
          console.error("Erreur AuthContext:", error);
          setUser(currentUser);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}