// src/pages/CartPage.js
import React from "react";
import { useCart } from "../context/CartContext";
import { PayPalButtons } from "@paypal/react-paypal-js";
import usePayPal from "../hooks/usePayPal";
import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

const fmt = (n) => `₪${Number(n || 0).toFixed(2)}`;

// helpers for safe text & image
const firstImage = (images, fallback = "") => {
  if (!images) return fallback;
  if (Array.isArray(images) && images.length) return images[0];
  if (typeof images === "string") return images;
  if (typeof images === "object") return images.url || images.src || images.thumb || fallback;
  return fallback;
};

// prefer an inline image if the item already carries one
const pickInlineImage = (it) =>
  it?.imageUrl ||
  firstImage(it?.images) ||
  (typeof it?.image === "string" ? it.image : "");

const textifyCategory = (c) => {
  if (!c) return "";
  if (typeof c === "string") return c;
  if (typeof c === "object") return c.name || c.id || "";
  return "";
};


const productName = (item) =>
  item?.title || item?.name || item?.styleTags?.title || "";


export default function CartPage() {
  const { cart, removeFromCart, clearCart } = useCart();
  const { createOrder, onApprove } = usePayPal();
  const [imgById, setImgById] = useState({}); // { [productId]: imageUrl }

  useEffect(() => {
  let cancelled = false;

  (async () => {
    const toUpdate = {};
    for (const it of cart || []) {
      if (!it?.id) continue;

      // already have an inline image on the cart item? skip
      if (pickInlineImage(it)) continue;

      // already cached? skip
      if (imgById[it.id]) continue;

      try {
        // adjust collection name if yours is different
        const snap = await getDoc(doc(db, "clothes", String(it.id)));
        if (snap.exists()) {
          const d = snap.data();
          const url =
            firstImage(d?.images) ||
            (typeof d?.image === "string" ? d.image : "");
          if (url) toUpdate[it.id] = url;
        }
      } catch {
        // ignore single-item fetch errors
      }
    }

    if (!cancelled && Object.keys(toUpdate).length) {
      setImgById((prev) => ({ ...prev, ...toUpdate }));
    }
  })();

  return () => {
    cancelled = true;
  };
}, [cart, imgById, ]);


  if (!cart?.length) {
    return (
      <div className="container" dir="rtl">
        <h1 className="page-title">העגלה שלי</h1>
        <p>העגלה ריקה</p>
      </div>
    );
  }

  const total = cart.reduce((sum, it) => sum + Number(it.price || 0), 0);

  return (
    <div className="container" dir="rtl">
      <h1 className="page-title">העגלה שלי</h1>

      {/* Desktop: table */}
      <table className="table cart-table">
        <thead>
          <tr>
            <th>מוצר</th>
            <th>מחיר יחידה</th>
            <th style={{ width: 120 }}>פעולה</th>
          </tr>
        </thead>
        <tbody>
          {cart.map((it, idx) => (
            <tr key={`${it.id}-${idx}`}>
              <td>
  {(() => {
    const name = productName(it);
    const cat = textifyCategory(it.category);
    const src = pickInlineImage(it) || imgById[it.id] || "";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
         {src ? (
  <img
    src={src}
    alt={productName(it) || textifyCategory(it.category) || "product"}
    style={{
      width: 44,
      height: 44,
      objectFit: "cover",
      borderRadius: 8,
      background: "#f2e9ea",
      flexShrink: 0,
    }}
  />
) : (
  <span
    style={{
      width: 44,
      height: 44,
      borderRadius: 8,
      background: "#f2e9ea",
      display: "inline-block",
      flexShrink: 0,
    }}
  />
)}
        <div style={{ display: "grid", lineHeight: 1.2 }}>
          <span style={{ fontWeight: 600 }}>{name || "—"}</span>
          <span style={{ fontSize: 12, opacity: 0.75 }}>{cat}</span>
        </div>
      </div>
    );
  })()}
</td>

              <td>{fmt(it.price)}</td>
              <td>

                <button type="button" onClick={() => removeFromCart(idx)}>
                  הסר
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: cards */}
      <div className="cart-cards">
        {cart.map((it, idx) => (
          <article key={`${it.id}-${idx}`} className="cart-card card">
            <div className="cart-card-row">
              {(() => {
                const src = pickInlineImage(it) || imgById[it.id] || "";
                return src ? (
                  <img
                    src={src}
                    alt={it.name}
                    style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", flex: "0 0 56px" }}
                  />
                ) : (
                  <div className="product-fallback" style={{ width: 56, height: 56, borderRadius: 10 }} />
                );
              })()}

              <div className="cart-card-meta">
                <div className="cart-card-title">{it.name}</div>
                <div className="cart-card-sub">{typeof it.category === "object" ? (it.category?.name || it.category?.label || it.category?.id || "") : (it.category || "")}
</div>
              </div>
              <div className="cart-card-price">{fmt(it.price)}</div>
            </div>
            <div className="cart-card-actions">

              <button type="button" onClick={() => removeFromCart(idx)}>
                הסר
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Payment box */}
      <div
        className="card payment-box"
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 12,
          maxWidth: 560,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 800,
          }}
        >
          <span>סה״כ לעגלה</span>
          <span>{fmt(total)}</span>
        </div>

        <div style={{ textAlign: "center" }}>
          <PayPalButtons
            style={{ layout: "vertical", shape: "rect" }}
            createOrder={() => createOrder()}
            onApprove={(data) =>
              onApprove(data.orderID).then(() => {
                alert("ההזמנה בוצעה בהצלחה!");
              })
            }
            onError={(err) => {
              console.error(err);
              alert("אירעה שגיאה בתשלום");
            }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn-outline" onClick={clearCart}>
            נקה עגלה
          </button>
        </div>
      </div>
    </div>
  );
}
