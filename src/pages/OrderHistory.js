import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, query, where, orderBy, getDocs } from "firebase/firestore";

export default function OrderHistory() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const auth     = getAuth();
  const db       = getFirestore();
  const uid      = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const q = query(
        collection(db, "orders"),
        where("userId", "==", uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    })();
  }, [uid, db]);

  if (loading) return <h2> טוען הזמנות...</h2>;
  if (!orders.length) return <h2> אין היסטוריית הזמנות</h2>;

  return (
    <div>
      <h1>הזמנות קודמות</h1>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {orders.map(o => (
          <li key={o.id} style={{ marginBottom: 24, borderBottom: "1px solid #ccc", paddingBottom: 16 }}>
            <p><strong>תאריך:</strong> {o.createdAt.toDate().toLocaleString()}</p>
            <p><strong>Order ID:</strong> {o.orderId}</p>
            <p><strong>Amount:</strong> {o.amount.currency_code} {o.amount.value}</p>
            {/* If you stored line‑items, you could map them here */}
          </li>
        ))}
      </ul>
    </div>
  );
}
