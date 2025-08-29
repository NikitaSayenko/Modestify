// =========================================================================
// 1) Imports & config
// =========================================================================
require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const fetch   = require("node-fetch");
const admin   = require("firebase-admin");


// =========================================================================
// 2) Firebase Admin init
// =========================================================================
admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  })
});
const firestore = admin.firestore();


// =========================================================================
// 3) Express setup
// =========================================================================
const app = express();
app.use(cors());
app.use(express.json());


// =========================================================================
// 4) PayPal helper
// =========================================================================
const PAYPAL_BASE = process.env.PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

async function generateAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:  `Basic ${auth}`
    },
    body: "grant_type=client_credentials"
  });
  const { access_token } = await res.json();
  return access_token;
}


// =========================================================================
// 5) Routes
// =========================================================================

// Create PayPal order
app.post("/api/paypal/create-order", async (req, res) => {
  try {
    const token    = await generateAccessToken();
    const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        Authorization:   `Bearer ${token}`
      },
      body: JSON.stringify({
        intent:         "CAPTURE",
        purchase_units: req.body.purchase_units
      })
    });

    const data = await response.json();
    console.log("💡 [server] create-order response:", data);

    // Only send back the order id (what React‑PayPal‑JS expects)
    return res
      .status(response.status)
      .json({ id: data.id });

  } catch (err) {
    console.error("❌ [server] create-order error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Capture PayPal order & persist to Firestore
app.post("/api/paypal/capture-order", async (req, res) => {
  const { orderID, userId } = req.body;

  if (!orderID || !userId) {
    return res.status(400).json({ error: "orderID and userId are required" });
  }

  try {
    const token    = await generateAccessToken();
    const response = await fetch(
      `${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`,
      {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`
        }
      }
    );

    const data = await response.json();
    console.log("💡 [server] capture‑order response:", data);

    // Persist order
    await firestore.collection("orders").add({
      userId:    userId,
      orderId:   data.id,
      amount:    data.purchase_units[0].payments.captures[0].amount,
      raw:       data,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(response.status).json(data);

  } catch (err) {
    console.error("❌ [server] capture‑order error:", err);
    return res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// 6) Start server
// =========================================================================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀 PayPal API server listening on ${PORT}`)
);
