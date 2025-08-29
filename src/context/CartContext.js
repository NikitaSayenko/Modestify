import React, { createContext, useContext, useReducer, useEffect } from "react";

// 1. Define actions
const ADD   = "ADD_ITEM";
const REMOVE = "REMOVE_ITEM";
const CLEAR = "CLEAR_CART";

// 2. Cart reducer
function cartReducer(state, action) {
  switch (action.type) {
    case ADD:
      return [...state, action.payload];
    case REMOVE:
      return state.filter(item => item.id !== action.payload);
    case CLEAR:
      return [];
    default:
      return state;
  }
}

// 3. Create context
const CartContext = createContext();

// 4. Provider component
export function CartProvider({ children }) {
  // initialize from localStorage if present
  const [cart, dispatch] = useReducer(
    cartReducer,
    [], 
    () => {
      try {
        const stored = localStorage.getItem("modestify_cart");
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
  );

  // write to localStorage on change
  useEffect(() => {
    localStorage.setItem("modestify_cart", JSON.stringify(cart));
  }, [cart]);

  // context value helpers
  const addToCart    = item  => dispatch({ type: ADD,   payload: item });
  const removeFromCart = id   => dispatch({ type: REMOVE,payload: id });
  const clearCart    = ()    => dispatch({ type: CLEAR });

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

// custom hook
export function useCart() {
  return useContext(CartContext);
}
