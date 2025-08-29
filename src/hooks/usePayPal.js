import { useMemo }    from "react";
import { useCart }     from "../context/CartContext";
import { getAuth }     from "firebase/auth";

export default function usePayPal() {
  const { cart, clearCart } = useCart();
  const auth = getAuth();

  // 1) Build purchase_units grouped by merchantPayPalEmail
  const purchaseUnits = useMemo(() => {
    const byMerchant = cart.reduce((acc, item) => {
      const m = item.merchantPayPalEmail;
      if (!acc[m]) acc[m] = { total: 0, reference_id: `unit_${Object.keys(acc).length+1}` };
      acc[m].total += Number(item.price);
      return acc;
    }, {});

    return Object.entries(byMerchant).map(([email, { total, reference_id }]) => ({
      reference_id,
      amount: {
        currency_code: "USD",              // or pull from your product data
        value: total.toFixed(2)
      },
      payee: {
        email_address: email
      }
    }));
  }, [cart]);

  // 2) createOrder → hit your server, return orderID
  const createOrder = async () => {
    const res = await fetch("http://localhost:4000/api/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchase_units: purchaseUnits })
    });
    const { id } = await res.json();
    return id;
  };

  // 3) onApprove → hit capture-order with orderID + userId
  const onApprove = async (orderID) => {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    const res = await fetch("http://localhost:4000/api/paypal/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderID, userId: user.uid })
    });
    const data = await res.json();

    // 4) success! clear cart
    clearCart();
    return data;
  };

  return { createOrder, onApprove };
}
