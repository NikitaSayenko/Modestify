// src/pages/Favorites.js
import React, { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import {collection, doc, getDoc, onSnapshot, orderBy, query, deleteDoc,} from "firebase/firestore";
import ProductCard from "../components/ProductCard";

export default function Favorites() {
  const { addToCart } = useCart();
  const { firebaseUser } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  async function removeFavorite(productId) {
    if (firebaseUser?.uid) {
      await deleteDoc(doc(db, "users", firebaseUser.uid, "favorites", productId));
    } else {
      const arr = (JSON.parse(localStorage.getItem("favorites") || "[]") || [])
        .filter((x) => String(x.id ?? x.productId ?? x) !== String(productId));
      localStorage.setItem("favorites", JSON.stringify(arr));
      setFavorites((prev) => prev.filter((it) => String(it.id) !== String(productId)));
    }
  }

  useEffect(() => {
    let unsub;
    setLoading(true);

    // Signed-in → realtime from Firestore
    if (firebaseUser?.uid) {
      const favCol = collection(db, "users", firebaseUser.uid, "favorites");
      const qFavs = query(favCol, orderBy("createdAt", "desc"));

      unsub = onSnapshot(qFavs, async (snap) => {
        const ids = snap.docs.map((d) => d.id);
        if (ids.length === 0) { setFavorites([]); setLoading(false); return; }

        const docs = await Promise.all(
          ids.map((id) => getDoc(doc(db, "clothes", id)).catch(() => null))
        );
        const results = docs
          .filter((s) => s && s.exists())
          .map((s) => ({ id: s.id, ...s.data() }));

        setFavorites(results);
        setLoading(false);
      });

      return () => unsub && unsub();
    }

    // Guest → localStorage ids, then fetch product docs
    (async () => {
      const raw = JSON.parse(localStorage.getItem("favorites") || "[]") || [];
      const ids = raw.map((x) => String(x?.id ?? x?.productId ?? x)).filter(Boolean);
      if (ids.length === 0) { setFavorites([]); setLoading(false); return; }

      const docs = await Promise.all(
        ids.map((id) => getDoc(doc(db, "clothes", id)).catch(() => null))
      );
      const results = docs
        .filter((s) => s && s.exists())
        .map((s) => ({ id: s.id, ...s.data() }));

      setFavorites(results);
      setLoading(false);
    })();

    return () => {};
  }, [firebaseUser]);

  if (loading) {
    return (
      <div className="container">
        <h1 className="page-title">מועדפים</h1>
        <p>טוען מועדפים…</p>
      </div>
    );
  }

  return (
    <div className="container" dir="rtl">
      <h1 className="page-title">מועדפים</h1>

      {favorites.length === 0 ? (
        <p>אין פריטים במועדפים.</p>
      ) : (
        <div className="product-grid">
          {favorites.map((item) => (
            <div key={item.id}>
              {/* The standard card with working image + link */}
              <ProductCard product={item} />

              {/* Action row under the card */}
              <div
                className="product-actions"
                style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "center" }}
              >
                <button type="button" onClick={() => addToCart(item)}>
                  הוסף לעגלה
                </button>

                <button
                  type="button"
                  onClick={() => removeFavorite(item.id)}
                  style={{
                    background: "#e86a7a",
                    color: "#fff",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  הסר מהמועדפים
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
