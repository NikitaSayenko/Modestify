// src/pages/Personal.js
import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import {  doc, getDoc, setDoc, serverTimestamp,collection, onSnapshot, orderBy, query, deleteDoc} from "firebase/firestore";
import OrdersListCompact from "../components/OrdersListCompact";
import ProductCard from "../components/ProductCard";

export default function Personal() {
  const { firebaseUser } = useAuth();
  const { addToCart } = useCart();

  // profile state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const [fullName, setFullName] = useState("");
  const [email,    setEmail]    = useState("");
  const [phone,    setPhone]    = useState("");
  const [address,  setAddress]  = useState("");

  // UI state
  const [editOpen, setEditOpen] = useState(false);

  // favorites state
  const [favLoading, setFavLoading] = useState(true);
  const [favorites, setFavorites]   = useState([]);

  // remove favorite (user is signed-in on this page)
  async function removeFavorite(productId) {
    if (!firebaseUser?.uid) return;
    await deleteDoc(doc(db, "users", firebaseUser.uid, "favorites", productId));
  }

  // load profile
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!firebaseUser) { setLoading(false); return; }
      setLoading(true); setErr(""); setSavedMsg("");
      try {
        const ref  = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        const authEmail = firebaseUser.email || "";
        if (cancelled) return;
        if (snap.exists()) {
          const d = snap.data() || {};
          setFullName(d.fullName || "");
          setEmail(d.email || authEmail);
          setPhone(d.phone || "");
          setAddress(d.address || "");
        } else {
          setFullName(""); setEmail(authEmail); setPhone(""); setAddress("");
        }
      } catch (e) {
        if (!cancelled) setErr(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [firebaseUser]);

  // load favorites (users/{uid}/favorites -> clothes/{id})
  useEffect(() => {
    if (!firebaseUser?.uid) { setFavorites([]); setFavLoading(false); return; }
    const favCol = collection(db, "users", firebaseUser.uid, "favorites");
    const qFavs = query(favCol, orderBy("createdAt", "desc"));
    setFavLoading(true);

    const unsub = onSnapshot(qFavs, async (snap) => {
      const ids = snap.docs.map((d) => d.id);
      if (!ids.length) { setFavorites([]); setFavLoading(false); return; }
      const docs = await Promise.all(ids.map(id => getDoc(doc(db, "clothes", id)).catch(() => null)));
      const out = docs.filter(s => s && s.exists()).map(s => ({ id: s.id, ...s.data() }));
      setFavorites(out);
      setFavLoading(false);
    });

    return () => unsub();
  }, [firebaseUser]);

  // derived
  const summary = useMemo(() => ({
    fullName: fullName || "-",
    email:    email    || "-",
    phone:    phone    || "-",
    address:  address  || "-",
  }), [fullName, email, phone, address]);

  function validateProfile() {
    if (!firebaseUser) return "יש להתחבר כדי לעדכן פרופיל";
    if (!fullName.trim()) return "שם מלא הוא חובה";
    const em = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return "אימייל לא תקין";
    const ph = phone.trim();
    if (ph && !/^[0-9+\-\s()]{7,}$/.test(ph)) return "טלפון לא תקין";
    return "";
  }

  async function handleSave(e) {
    e.preventDefault();
    setErr(""); setSavedMsg("");
    const v = validateProfile();
    if (v) { setErr(v); return; }
    try {
      setSaving(true);
      const ref = doc(db, "users", firebaseUser.uid);
      await setDoc(ref, {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSavedMsg("הפרטים נשמרו בהצלחה");
      setEditOpen(false);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!firebaseUser) {
    return (
      <div className="container" dir="rtl">
        <h1 className="page-title">אזור אישי</h1>
        <div className="card">יש להתחבר כדי לצפות ולעדכן פרטים.</div>
      </div>
    );
  }
  if (loading) {
    return (
    <div className="container" dir="rtl">
      <h1 className="page-title">אזור אישי</h1>
      <div className="card">טוען פרופיל…</div>
    </div>
  );
 }
  return (
    <div className="container" dir="rtl">
      <h1 className="page-title">אזור אישי</h1>

      {/* header card with summary + toggle */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="section-title" style={{ marginBottom: 4 }}>פרטים אישיים</div>
            <div style={{ color: "var(--muted)" }}>{firebaseUser.email}</div>
          </div>
          <button className="button" onClick={() => setEditOpen(v => !v)}>
            {editOpen ? "סגור" : "עריכת פרטים"}
          </button>
        </div>

        {err && <div style={{ color: "crimson", marginTop: 8 }}>{err}</div>}
        {savedMsg && <div style={{ color: "green", marginTop: 8 }}>{savedMsg}</div>}

        {!editOpen ? (
          <div className="account-summary">
            <div><strong>שם:</strong> {summary.fullName}</div>
            <div><strong>אימייל:</strong> {summary.email}</div>
            <div><strong>טלפון:</strong> {summary.phone}</div>
            <div><strong>כתובת:</strong> {summary.address}</div>
          </div>
        ) : (
          <form className="profile-form" onSubmit={handleSave} style={{ marginTop: 12 }}>
            <div className="form-row">
              <label>שם מלא</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div className="form-row">
              <label>אימייל (לתקשורת/משלוח)</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-row">
              <label>טלפון</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+972 5X-XXXXXXX" />
            </div>
            <div className="form-row">
              <label>כתובת</label>
              <textarea rows={3} value={address} onChange={e => setAddress(e.target.value)} placeholder="רחוב, מספר, עיר, מיקוד" />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="submit" disabled={saving}>{saving ? "שומר…" : "שמור"}</button>
            </div>
          </form>
        )}
      </section>

      {/* favorites */}
      <section className="panel">
        <h2 className="section-title">המועדפים שלי</h2>
        {favLoading ? (
          <div className="muted">טוען…</div>
        ) : !favorites.length ? (
          <div className="muted">אין פריטים במועדפים.</div>
        ) : (
          <div className="product-grid">
            {favorites.map((p) => (
              <div key={p.id}>
                {/* Standard site card */}
                <ProductCard product={p} />

                {/* Small action row under the card (same style as Favorites page) */}
                <div
                  className="product-actions"
                  style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "center" }}
                >
                  <button
                    type="button"
                    onClick={() => addToCart(p)}
                    style={{ padding: "6px 10px", fontSize: 13 }}
                  >
                    הוסף לעגלה
                  </button>

                  <button
                    type="button"
                    onClick={() => removeFavorite(p.id)}
                    style={{
                      padding: "6px 10px",
                      fontSize: 13,
                      background: "#e86a7a",
                      color: "#fff",
                      border: "none",
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
      </section>

      {/* orders */}
      <section className="panel">
        <h2 className="section-title">ההזמנות שלי</h2>
        <OrdersListCompact />
      </section>
    </div>
  );
}
