// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile]         = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setFirebaseUser(user);
          // load user profile (e.g., role) if present
          const ref  = doc(db, "users", user.uid);
          const snap = await getDoc(ref);
          setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        } else {
          setFirebaseUser(null);
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Expose a logout that NavBar (and others) can call
  async function logout() {
    try {
      await signOut(auth);
      // onAuthStateChanged will clear firebaseUser/profile
    } catch (e) {
      console.error("logout failed:", e);
      throw e;
    }
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, profile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
