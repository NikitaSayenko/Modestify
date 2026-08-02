// src/pages/OrderHistory.js
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { collection, query, where, orderBy, limit, startAfter, getDocs } from "firebase/firestore";

const PAGE_SIZE = 10;

function toDateSafe(ts) {
  try {
    if (ts?.toDate) return ts.toDate();
    if (typeof ts === "number") return new Date(ts);
    if (typeof ts === "string") return new Date(ts);
  } catch {}
  return null;
}

function formatMoney(o) {
  if (typeof o?.price === "number") {
    const c = o.currency || "ILS";
    const sym = c === "ILS" ? "₪" : c;
    return `${sym}${o.price.toFixed(2)} (${c})`;
  }
  const amt = o?.amount;
  if (amt && typeof amt === "object") {
    const v = Number(amt.value);
    const c = amt.currency_code || "ILS";
    const sym = c === "ILS" ? "₪" : c;
    return Number.isFinite(v) ? `${sym}${v.toFixed(2)} (${c})` : `— (${c})`;
  }
  const puAmt = o?.purchase_units?.[0]?.amount;
  if (puAmt && typeof puAmt === "object") {
    const v = Number(puAmt.value);
    const c = puAmt.currency_code || "ILS";
    const sym = c === "ILS" ? "₪" : c;
    return Number.isFinite(v) ? `${sym}${v.toFixed(2)} (${c})` : `— (${c})`;
  }
  return "—";
}
function norm(s) {
  return (s ?? "").toString().toLowerCase().trim();
}


export default function OrderHistory() {
  const { firebaseUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef(null);
  const [q, setQ] = useState("");


  useEffect(() => {
    if (!firebaseUser?.uid) {
      setOrders([]);
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function loadFirst() {
      setLoading(true);
      setErr("");
      try {
        const q = query(
          collection(db, "orders"),
          where("userId", "==", firebaseUser.uid),
          orderBy("createdAt", "desc"),
          limit(PAGE_SIZE + 1)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const docs = snap.docs;
        // FIX: spread correctly
        setOrders(docs.slice(0, PAGE_SIZE).map((d) => ({ id: d.id, ...d.data() })));
        setHasMore(docs.length > PAGE_SIZE);
        cursorRef.current = docs.length ? docs[docs.length - 1] : null;
      } catch (e) {
        if (!cancelled) setErr(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadFirst();
    return () => {
      cancelled = true;
    };
  }, [firebaseUser?.uid]);

const filteredOrders = React.useMemo(() => {
  const needle = norm(q);
  if (!needle) return orders;

  return orders.filter((o) => {
    const id       = norm(o.orderId || o.id);
    const status   = norm(o.status);
    const provider = norm(o.provider);
    const money    = norm(formatMoney(o));
    const dt       = toDateSafe(o.createdAt);
    const dateTxt  = norm(dt ? dt.toLocaleString() : "");

    return (
      id.includes(needle) ||
      status.includes(needle) ||
      provider.includes(needle) ||
      money.includes(needle) ||
      dateTxt.includes(needle)
    );
  });
}, [orders, q]);

  async function loadMore() {
    if (loadingMore || !cursorRef.current || !firebaseUser?.uid) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "orders"),
        where("userId", "==", firebaseUser.uid),
        orderBy("createdAt", "desc"),
        startAfter(cursorRef.current),
        limit(PAGE_SIZE + 1)
      );
      const snap = await getDocs(q);
      const docs = snap.docs;
      setOrders((prev) => [...prev, ...docs.slice(0, PAGE_SIZE).map((d) => ({ id: d.id, ...d.data() }))]);
      setHasMore(docs.length > PAGE_SIZE);
      cursorRef.current = docs.length ? docs[docs.length - 1] : null;
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) return <div className="container">טוען…</div>;
  if (err) return <div className="container" style={{ color: "#b00020" }}>{err}</div>;

  return (
    <div className="container" dir="rtl">
      <h1 className="page-title">הזמנות שלי</h1>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:12 }}>
  <input
    type="search"
    dir="rtl"
    placeholder="חיפוש בהזמנות…"
    value={q}
    onChange={(e) => setQ(e.target.value)}
    style={{ border:"1px solid var(--line)", borderRadius:10, padding:"8px 12px", minWidth:220, outline:"none" }}
  />
  <small style={{ color:"var(--muted)" }}>
    {filteredOrders.length}/{orders.length}
  </small>
</div>

      <div className="card">
        {orders.length === 0 ? (
          <div>אין הזמנות.</div>
        ) : (
          filteredOrders.map((o) => {

            const dt = toDateSafe(o.createdAt);
            return (
              <div key={o.id} className="order-row">
                <div className="order-money">{formatMoney(o)}</div>
                <div className="order-meta">
                  {dt ? dt.toLocaleString() : "—"}
                  <br />
                  <small style={{ color: "var(--muted)" }}>{o.orderId || o.id}</small>
                </div>
                <Link to={`/orders/${o.id}`} className="btn-outline">
                  פרטים
                </Link>
              </div>
            );
          })
        )}
        {hasMore && (
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <button className="btn" disabled={loadingMore} onClick={loadMore}>
              {loadingMore ? "טוען…" : "טען עוד"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
