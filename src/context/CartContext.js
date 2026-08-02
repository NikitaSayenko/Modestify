import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
} from "react";

// Actions
const ADD = "ADD_ITEM";
const REMOVE_AT = "REMOVE_AT";
const CLEAR = "CLEAR_CART";

// Reducer
function cartReducer(state, action) {
  switch (action.type) {
    case ADD:
      return [...state, action.payload];

    case REMOVE_AT:
      return state.filter((_, index) => index !== action.payload);

    case CLEAR:
      return [];

    default:
      return state;
  }
}

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, [], () => {
    try {
      const storedCart = localStorage.getItem("modestify_cart");
      return storedCart ? JSON.parse(storedCart) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("modestify_cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item) => {
    dispatch({
      type: ADD,
      payload: item,
    });
  };

  const removeFromCart = (index) => {
    dispatch({
      type: REMOVE_AT,
      payload: index,
    });
  };

  const clearCart = () => {
    dispatch({
      type: CLEAR,
    });
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}