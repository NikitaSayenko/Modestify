// src/pages/OrderDetails.js
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getFirestore, doc, getDoc } from "firebase/firestore";

function toDateSafe(ts) {
  try {
    if (ts?.toDate) return ts.toDate();
    if (typeof ts === "number") return new Date(ts);
    if (typeof ts === "string") return new Date(ts);
  } catch {}
  return null;
}

// Force LTR for mixed content (IDs, dates, money)
function Ltr({ children }) {
  return (
    <span style={{ direction: "ltr", unicodeBidi: "plaintext", display: "inline-block" }}>
      {children}
    </span>
  );
}

// Extract a single displayable order id (no duplicates)
function pickOrderId(o) {
  return (
    o?.orderId ||
    o?.captureId ||
    o?.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
    o?.id ||
    ""
  );
}

// Favor your schema: price:number, currency:string
function extractAmount(o) {
  if (typeof o?.price === "number") {
    return { value: o.price, currency: o.currency || "ILS" };
  }
  const pu = o?.purchase_units?.[0]?.amount;
  if (pu?.value != null) {
    const n = Number(pu.value);
    return {
      value: Number.isFinite(n) ? n : null,
      currency: pu.currency_code || o.currency || "ILS",
    };
  }
  if (typeof o?.amount === "number") {
    return { value: o.amount, currency: o.currency || "ILS" };
  }
  if (o?.amount && typeof o.amount === "object" && "value" in o.amount) {
    const n = Number(o.amount.value);
    return {
      value: Number.isFinite(n) ? n : null,
      currency: o.amount.currency_code || o.currency || "ILS",
    };
  }
  return { value: null, currency: o?.currency || "ILS" };
}

function formatMoney(o) {
  const { value, currency } = extractAmount(o);
  const sym = currency === "ILS" ? "₪" : currency === "USD" ? "$" : currency;
  if (value == null) return `${sym} — (${currency})`;
  return `${sym} ${Number(value).toFixed(2)} (${currency})`;
}

// Only show items if they actually exist in the order doc
function pickItems(o) {
  if (Array.isArray(o?.items)) return o.items;
  if (Array.isArray(o?.cart)) return o.cart;
  if (Array.isArray(o?.products)) return o.products;
  return [];
}

export default function OrderDetails() {
  const { id } = useParams();
  const db = getFirestore();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const snap = await getDoc(doc(db, "orders", id));
        if (cancelled) return;
        if (!snap.exists()) {
          setErr("הזמנה לא נמצאה");
          setOrder(null);
        } else {
          setOrder({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        if (!cancelled) setErr(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [db, id]);

  if (loading) return <div className="container" dir="rtl" style={{ marginTop: 24 }}>טוען…</div>;
  if (err)     return <div className="container" dir="rtl" style={{ marginTop: 24, color: "crimson" }}>שגיאה: {err}</div>;
  if (!order)  return null;

  const created = toDateSafe(order.createdAt)?.toLocaleString?.() || "";
  const orderId = pickOrderId(order);
  const items = pickItems(order);

  return (
    <div className="container" dir="rtl" style={{ maxWidth: 900, margin: "24px auto" }}>
      <h1 className="page-title">פרטי הזמנה</h1>

      {/* Summary card */}
      <div className="card" style={{ border: "1px solid #e5e5e5", padding: 16, borderRadius: 8 }}>
        {orderId && (
          <div style={{ marginBottom: 4, display: "flex", gap: 6 }}>
            <strong>מספר הזמנה:</strong>
            <Ltr>{orderId}</Ltr>
          </div>
        )}
        {created && (
          <div style={{ marginBottom: 4, display: "flex", gap: 6 }}>
            <strong>תאריך:</strong>
            <Ltr>{created}</Ltr>
          </div>
        )}
        <div style={{ marginBottom: 4, display: "flex", gap: 6 }}>
          <strong>סכום:</strong>
          <Ltr>{formatMoney(order)}</Ltr>
        </div>
        {order.merchantPayPalEmail && (
          <div style={{ marginBottom: 4, display: "flex", gap: 6 }}>
            <strong>סוחר:</strong>
            <Ltr>{order.merchantPayPalEmail}</Ltr>
          </div>
        )}
      </div>

      {/* Items (only if present) */}
      {items.length > 0 && (
        <>
          <h2 style={{ marginTop: 16 }}>פריטים</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{background:"white", textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>שם</th>
                <th style={{background:"white", textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>כמות</th>
                <th style={{background:"white", textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>מחיר</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id || i}>
                  <td style={{background:"white", borderBottom: "1px solid #000000ff", padding: 8 }}>
                    {it.name || it.title || it.productName || it.id || "-"}
                  </td>
                  <td style={{ background:"white", borderBottom: "1px solid #000000ff", padding: 8 }}>
                    <Ltr>{it.quantity ?? it.qty ?? 1}</Ltr>
                  </td>
                  <td style={{ background:"white", borderBottom: "1px solid #000000ff", padding: 8 }}>
                    <Ltr>
                      {it.price != null ? `${Number(it.price).toFixed(2)} ₪` : "—"}
                    </Ltr>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div style={{ marginTop: 16 }}>
        <Link to="/orders">
          <button type="button">חזרה להזמנות</button>
        </Link>
      </div>
    </div>
  );
}
