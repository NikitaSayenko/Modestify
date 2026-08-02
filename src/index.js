import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import "bootstrap/dist/css/bootstrap.min.css";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
<React.StrictMode>
     <PayPalScriptProvider
      options={{
      "client-id": process.env.REACT_APP_PAYPAL_CLIENT_ID,
      currency:   "ILS",
      intent:   "capture"
      }}
      >
            <AuthProvider>
      <CartProvider>
        <App />
      </CartProvider>
  </AuthProvider>

      </PayPalScriptProvider>
</React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals

