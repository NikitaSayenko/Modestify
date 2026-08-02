// ==========================
// useUserRole: role lookup for current user
// ==========================
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

/**
 * Returns { uid, role, isAdmin, loading } for client-side access control.
 * Role is read from Firestore at users/{uid}. Defaults to "user" if missing.
 */
export default function useUserRole() {
  const [uid, setUid] = useState(null);
  const [role, setRole] = useState(null);   // "admin" | "user" | null (while resolving)
  const [loading, setLoading] = useState(true);

  // Subscribe to Firebase Auth state and keep uid in sync
  useEffect(() => {
    const auth = getAuth();
    const stop = onAuthStateChanged(auth, (u) => setUid(u?.uid || null));
    return () => stop();
  }, []);

  // Fetch role from Firestore when uid changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!uid) { setRole(null); setLoading(false); return; }
      setLoading(true);
      try {
        const db = getFirestore();
        const snap = await getDoc(doc(db, "users", uid));
        if (!cancelled) {
          const r = snap.exists() ? (snap.data().role || "user") : "user";
          setRole(r);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [uid]);

  return { uid, role, isAdmin: role === "admin", loading };
}
