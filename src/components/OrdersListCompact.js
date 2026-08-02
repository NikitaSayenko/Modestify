import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { collection, query, where, orderBy, limit, startAfter, getDocs } from "firebase/firestore";

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
  return "--";
}

// Normalize a string for search
function norm(s) {
  return (s ?? "").toString().toLowerCase().trim();
}

export default function OrdersListCompact({ pageSize = 3 }) {
  const { firebaseUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef(null);

  // Client-side search query
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
        const qy = query(
          collection(db, "orders"),
          where("userId", "==", firebaseUser.uid),
          orderBy("createdAt", "desc"),
          limit(pageSize + 1)
        );
        const snap = await getDocs(qy);
        if (cancelled) return;
        const docs = snap.docs;
        setOrders(docs.slice(0, pageSize).map((d) => ({ id: d.id, ...d.data() })));
        setHasMore(docs.length > pageSize);
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
  }, [firebaseUser?.uid, pageSize]);

  async function loadMore() {
    if (loadingMore || !cursorRef.current || !firebaseUser?.uid) return;
    setLoadingMore(true);
    try {
      const qy = query(
        collection(db, "orders"),
        where("userId", "==", firebaseUser.uid),
        orderBy("createdAt", "desc"),
        startAfter(cursorRef.current),
        limit(pageSize + 1)
      );
      const snap = await getDocs(qy);
      const docs = snap.docs;
      setOrders((prev) => [...prev, ...docs.slice(0, pageSize).map((d) => ({ id: d.id, ...d.data() }))]);
      setHasMore(docs.length > pageSize);
      cursorRef.current = docs.length ? docs[docs.length - 1] : null;
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoadingMore(false);
    }
  }

  // Apply client-side search over the loaded orders
  const filtered = useMemo(() => {
    const s = norm(q);
    if (!s) return orders;
    return orders.filter((o) => {
      const id1 = norm(o.orderId || "");
      const id2 = norm(o.id || "");
      const email = norm(o.userEmail || o.email || "");
      const status = norm(o.status || "");
      return (
        id1.includes(s) ||
        id2.includes(s) ||
        email.includes(s) ||
        status.includes(s)
      );
    });
  }, [orders, q]);

  if (loading) return <div>טוען…</div>;
  if (err) return <div style={{ color: "#b00020" }}>{err}</div>;

  return (
    <div className="card">
      {/* Lightweight search input (client-side only) */}
      <div className="search-bar" style={{ marginBottom: 12 }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="חיפוש הזמנות… (מס׳ הזמנה, אימייל, סטטוס)"
        />
      </div>

      {filtered.length === 0 ? (
        <div>אין הזמנות עדיין.</div>
      ) : (
        filtered.map((o) => {
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
  );
}
