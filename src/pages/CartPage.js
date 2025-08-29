// src/pages/CartPage.js
import React from "react";
import { useCart } from "../context/CartContext";
import { PayPalButtons } from "@paypal/react-paypal-js";
import usePayPal from "../hooks/usePayPal";

export default function CartPage() {
  const { cart, removeFromCart, clearCart } = useCart();
  const { createOrder, onApprove } = usePayPal();

  if (cart.length === 0) {
    return <h2>העגלה ריקה</h2>;
  }

  const total = cart
    .reduce((sum, item) => sum + Number(item.price), 0)
    .toFixed(2);

  return (
    <div>
      <h1>העגלה שלי</h1>
      {cart.map(item => (
        <div key={item.id} style={{ marginBottom: 16 }}>
          <img src={item.imageUrl} alt={item.name} width={80} />
          <span>
            {item.name} — ${item.price}
          </span>
          <button onClick={() => removeFromCart(item.id)}>הסר</button>
        </div>
      ))}

      <h2>סך הכל: ${total}</h2>
      <button onClick={clearCart}>נקה עגלה</button>

      <div style={{ maxWidth: 400, marginTop: 20 }}>
        <PayPalButtons
          createOrder={(_, actions) => {
            // delegate to your hook
            return createOrder();
          }}
          onApprove={(data, actions) => {
            // data.orderID is what your hook expects
            return onApprove(data.orderID).then(() => {
              alert("ההזמנה בוצעה בהצלחה!");
            });
          }}
          onError={err => {
            console.error(err);
            alert("אירעה שגיאה בתשלום");
          }}
        />
      </div>
    </div>
  );
}
