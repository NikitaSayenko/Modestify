// ==========================
// PayPal Client Hook
// ==========================

import { useMemo } from "react";
import { getAuth } from "firebase/auth";
import { useCart } from "../context/CartContext";

// Uses the deployed backend URL when provided and localhost during development.
const API_BASE = (
  process.env.REACT_APP_API_BASE || "http://localhost:4000"
).replace(/\/+$/, "");

const CURRENCY = "ILS";

function toSafeText(value, fallback = "") {
  if (value == null) return fallback;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (typeof value === "object") {
    return String(
      value.name ??
        value.title ??
        value.label ??
        value.id ??
        fallback
    );
  }

  return fallback;
}

/**
 * Creates a compact snapshot of the cart for order persistence.
 * Identical products are grouped by product id and merchant email.
 */
function snapshotCart(cart) {
  const groupedItems = new Map();

  for (const item of cart) {
    const id = String(
      item.id ??
        item.docId ??
        item.productId ??
        ""
    );

    if (!id) continue;

    const parsedPrice = Number(item.price);
    const price = Number.isFinite(parsedPrice) ? parsedPrice : 0;

    const name = toSafeText(
      item.name ??
        item.title ??
        item.productName,
      id
    );

    const merchantPayPalEmail = toSafeText(
      item.merchantPayPalEmail
    );

    const key = `${id}|${merchantPayPalEmail}`;

    if (!groupedItems.has(key)) {
      groupedItems.set(key, {
        id,
        name,
        price,
        quantity: 1,
        merchantPayPalEmail,
      });
    } else {
      groupedItems.get(key).quantity += 1;
    }
  }

  return Array.from(groupedItems.values());
}

/**
 * Provides PayPal order creation and capture handlers.
 */
export default function usePayPal() {
  const { cart, clearCart } = useCart();
  const auth = getAuth();

  const purchaseUnits = useMemo(() => {
    const total = cart.reduce((sum, item) => {
      const price = Number(item.price);
      return sum + (Number.isFinite(price) ? price : 0);
    }, 0);

    return [
      {
        reference_id: "unit_1",
        amount: {
          currency_code: CURRENCY,
          value: total.toFixed(2),
        },
        description: "Modestify order",
      },
    ];
  }, [cart]);

  const createOrder = async () => {
    if (cart.length === 0) {
      throw new Error("The cart is empty");
    }

    const response = await fetch(
      `${API_BASE}/api/paypal/create-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          purchase_units: purchaseUnits,
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.id) {
      throw new Error(
        data.error || "Failed to create PayPal order"
      );
    }

    return data.id;
  };

  const onApprove = async (orderID) => {
    const user = auth.currentUser;
    const items = snapshotCart(cart);

    const response = await fetch(
      `${API_BASE}/api/paypal/capture-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderID,
          userId: user?.uid || null,
          items,
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || "Failed to capture PayPal order"
      );
    }

    clearCart();

    return data;
  };

  return {
    createOrder,
    onApprove,
  };
}