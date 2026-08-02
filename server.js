// Express server for Modestify: protected /api/import that pulls products from Platzi or DummyJSON
// and writes them into Firestore 'clothes' collection with admin-approval workflow.

// ----------------- setup -----------------
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // v2 per package.json
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();

app.disable("x-powered-by");

const configuredFrontendOrigins = (
  process.env.FRONTEND_URLS ||
  process.env.FRONTEND_URL ||
  ""
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  ...configuredFrontendOrigins,
]);

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header include server-to-server calls
      // and direct health-check requests.
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`Origin not allowed by CORS: ${origin}`)
      );
    },
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

app.use(express.json({ limit: "1mb" }));

// ---- PayPal config ----
const PAYPAL_MODE = String(
  process.env.PAYPAL_MODE || "sandbox"
).toLowerCase();

if (!["sandbox", "live"].includes(PAYPAL_MODE)) {
  throw new Error(
    'PAYPAL_MODE must be either "sandbox" or "live"'
  );
}

const PAYPAL_BASE =
  process.env.PAYPAL_BASE ||
  (PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com");

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;

const PAYPAL_SECRET =
  process.env.PAYPAL_CLIENT_SECRET ||
  process.env.PAYPAL_SECRET;

const ORDER_INTENT = "CAPTURE";

/** OAuth for PayPal */
async function getPayPalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    throw new Error("Missing PAYPAL_CLIENT_ID / PAYPAL_SECRET");
  }
  const cred = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");
  const resp = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${cred}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`PayPal token failed: ${resp.status} ${txt}`);
  }
  const json = await resp.json();
  return json.access_token;
}

// ---- Firebase Admin init ----
const requiredFirebaseVariables = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];

const missingFirebaseVariables =
  requiredFirebaseVariables.filter(
    (variableName) => !process.env[variableName]
  );

if (missingFirebaseVariables.length > 0) {
  throw new Error(
    `Missing Firebase environment variables: ${missingFirebaseVariables.join(
      ", "
    )}`
  );
}

if (!admin.apps.length) {
  const privateKey =
    process.env.FIREBASE_PRIVATE_KEY.replace(
      /\\n/g,
      "\n"
    );

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail:
        process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });

  admin.firestore().settings({
    ignoreUndefinedProperties: true,
  });
}

const db = admin.firestore();

// ----------------- helpers -----------------
/** Admin guard */
async function requireAdmin(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');
    if (!token) return res.status(401).json({ error: 'Missing Bearer token' });

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    const role = userDoc.exists ? userDoc.data().role : null;
    if (role !== 'admin') return res.status(403).json({ error: 'Forbidden: admin only' });

    req.adminUid = uid;
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    res.status(401).json({ error: 'Unauthorized' });
  }
}

/** ---------- DummyJSON settings (unchanged) ---------- */
const DJ_ALLOWED = [
  "womens-dresses",
  "tops",
  "womens-shoes",
  "womens-watches",
  "womens-bags",
  "womens-jewellery",
  "sunglasses",
];
const DJ_CAT_MAP = {
  "womens-dresses": "dress",
  "tops": "shirt",
  "womens-shoes": "shoes",
  "womens-watches": "accessories",
  "womens-bags": "accessories",
  "womens-jewellery": "accessories",
  "sunglasses": "accessories",
};

function inferCategoryFromText(title = "", description = "") {
  const t = `${title} ${description}`.toLowerCase();
  if (/\b(pant|pants|trouser|trousers|jean|jeans|jogger|joggers|legging|leggings|sweatpant|sweatpants|cargo)\b/.test(t)) return "pants";
  if (/\bskirt(s)?\b/.test(t)) return "skirt";
  if (/\b(shirt|blouse|top)\b/.test(t)) return "shirt";
  if (/\b(jacket|hoodie|hoodies|sweatshirt|sweatshirts|coat|coats|cardigan|cardigans|sweater|sweaters)\b/.test(t)) return "outerwear";
  if (/\b(maxi dress|abaya|gown)\b/.test(t)) return "dress";
  if (/(hijab|headscarf|scarf|shawl|veil|head wrap|headwrap|cap|caps|hat|hats|beanie|beanies|beret|turban|visor)\b/.test(t)) return "headcover";
  return null;
}
function keepWomenOnly(p) {
  const c = String(p?.category || "").toLowerCase();
  if (c.startsWith("mens-")) return false;
  const t = `${p?.title || ""} ${p?.description || ""}`.toLowerCase();
  if (/\b(men|mens|man's|boys|boy)\b/.test(t)) return false;
  return true;
}
async function fetchDummyjsonSearch(q, { limit = 32 } = {}) {
  const url = `https://dummyjson.com/products/search?q=${encodeURIComponent(q)}&limit=${limit}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`DummyJSON search "${q}" failed: ${resp.status}`);
  const json = await resp.json();
  return Array.isArray(json.products) ? json.products : [];
}
async function fetchDummyjsonCategory(cat, { page = 0, limit = 24 }) {
  const skip = Math.max(0, Number(page)) * Number(limit);
  const url = `https://dummyjson.com/products/category/${encodeURIComponent(cat)}?limit=${limit}&skip=${skip}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`DummyJSON ${cat} fetch failed: ${resp.status}`);
  const json = await resp.json();
  return Array.isArray(json.products) ? json.products : [];
}

/** ---------- Platzi: fetch only fashion categories, drop demo rows ---------- */

// We explicitly allow only these category names from Platzi
const PLATZI_ALLOWED_CAT_NAMES = new Set(["clothes", "shoes"]); // case-insensitive

function validHttpImages(images) {
  return (Array.isArray(images) ? images : [])
    .map((u) => String(u || ""))
    .filter((u) => /^https?:\/\//i.test(u));
}

// Titles used by Platzi demo/seed rows — drop them
function isPlatziDemoTitle(title = "") {
  const t = String(title || "").trim().toLowerCase();
  if (!t) return true;
  // exact or obvious demo patterns
  if (t === "test" || t === "new product" || t === "admon") return true;
  if (/(^|\s)test(\s|$)/.test(t)) return true;
  return false;
}

// Fetch categories, pick allowed IDs, then pull their products and paginate locally
async function fetchPlatziFashion({ page = 0, limit = 24 }) {
  // 1) categories
  const catsResp = await fetch(`https://api.escuelajs.co/api/v1/categories`);
  if (!catsResp.ok) throw new Error(`Platzi categories failed: ${catsResp.status}`);
  const allCats = await catsResp.json();
  const fashionCats = (Array.isArray(allCats) ? allCats : [])
    .filter((c) => c && PLATZI_ALLOWED_CAT_NAMES.has(String(c.name || "").toLowerCase()));

  // 2) fetch products for each allowed category
  let combined = [];
  for (const c of fashionCats) {
    const url = `https://api.escuelajs.co/api/v1/categories/${encodeURIComponent(c.id)}/products`;
    const resp = await fetch(url);
    if (!resp.ok) continue;
    const arr = await resp.json();
    if (Array.isArray(arr)) {
      // stash category name for normalization downstream
      combined.push(...arr.map((p) => ({ ...p, __catName: String(c.name || "") })));
    }
  }

  // 3) clean & filter: must have real images, price > 0, and not demo/test titles
  combined = combined.filter((p) => {
    const imgs = validHttpImages(p?.images);
    const price = Number(p?.price);
    if (!imgs.length) return false;
    if (!Number.isFinite(price) || price <= 0) return false;
    if (isPlatziDemoTitle(p?.title)) return false;
    return true;
  });

  // 4) dedupe by source id (Platzi id)
  const seen = new Set();
  const deduped = [];
  for (const p of combined) {
    const id = String(p?.id);
    if (seen.has(id)) continue;
    seen.add(id);
    deduped.push(p);
  }

  // 5) local pagination to emulate offset/limit
  const offset = Math.max(0, Number(page)) * Number(limit);
  return deduped.slice(offset, offset + Number(limit));
}

// Map Platzi -> our schema; we receive category name context
function mapPlatzi(p) {
  const images = validHttpImages(p?.images);
  const rawCat = String(p?.__catName || p?.category?.name || "").toLowerCase();
  let normalized = null;
  if (rawCat === "shoes") normalized = "shoes";
  else if (rawCat === "clothes") {
    normalized = inferCategoryFromText(p?.title, p?.description) || "shirt";
  }

  return {
    id: null,
    title: p?.title ?? "",
    price: Number(p?.price ?? 0),
    description: p?.description ?? "",
    images,
    ...(normalized ? { category: normalized } : {}),
    brand: p?.brand ?? undefined,
    available: true,
    approved: false,

    sleeveLength: null,
    neckCoverage: null,
    hemLength: null,
    opacity: null,
    fit: null,
    styleTags: [],

    sourceApi: "platzi",
    sourceId: String(p?.id),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

/** ---------- DummyJSON mapper (unchanged) ---------- */
function mapDummyjson(p) {
  const imgs = p.images || (p.thumbnail ? [p.thumbnail] : []);
  const normalized =
    DJ_CAT_MAP[p.category] ||
    inferCategoryFromText(p.title, p.description) ||
    "accessories";

  return {
    id: null,
    title: p.title ?? "",
    price: Number(p.price ?? 0),
    description: p.description ?? "",
    images: (Array.isArray(imgs) ? imgs.filter(Boolean) : []).map(String),
    category: normalized,
    brand: p.brand ?? null,
    available: true,
    approved: false,

    sleeveLength: null,
    neckCoverage: null,
    hemLength: null,
    opacity: null,
    fit: null,
    styleTags: [],

    sourceApi: "dummyjson",
    sourceId: String(p.id),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

/** ---------- writeClothesBatch (preserve approvals, dedupe) ---------- */
function nonEmptyCategory(cat) {
  if (!cat) return false;
  if (typeof cat === "string") return cat.trim().length > 0;
  if (typeof cat === "object") {
    const name = String(cat.name || "").trim();
    const id = String(cat.id || "").trim();
    return !!name || !!id;
  }
  return false;
}
function pruneUndefined(obj) {
  if (Array.isArray(obj)) return obj.map(pruneUndefined);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      out[k] = pruneUndefined(v);
    }
    return out;
  }
  return obj;
}

async function writeClothesBatch(mappedItems) {
  if (!mappedItems.length) return { written: 0 };

  const entries = [];
  const seen = new Set();
  for (const item of mappedItems) {
    const docId = `${item.sourceApi}_${item.sourceId}`;
    if (seen.has(docId)) continue;
    seen.add(docId);
    entries.push({ docId, item });
  }

  const refs = entries.map(e => db.collection("clothes").doc(e.docId));
  const snaps = await Promise.all(refs.map(r => r.get()));

  const batch = db.batch();
  let count = 0;

  for (let i = 0; i < entries.length; i++) {
    const { docId, item } = entries[i];
    const ref = refs[i];
    const snap = snaps[i];
    const prev = snap.exists ? snap.data() : null;

    const approved = snap.exists ? (prev?.approved === true) : false;
    const available = snap.exists
      ? (typeof prev?.available === "boolean" ? prev.available : true)
      : (item.available ?? true);

    const nextCategory = snap.exists && nonEmptyCategory(prev?.category)
      ? prev.category
      : (nonEmptyCategory(item.category) ? item.category : undefined);

    const next = pruneUndefined({
      ...item,
      id: docId,
      approved,
      available,
      category: nextCategory,
      sourceApi: prev?.sourceApi || item.sourceApi,
      sourceId: prev?.sourceId || item.sourceId,
      createdAt: prev?.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    batch.set(ref, next, { merge: true });
    count += 1;
  }

  await batch.commit();
  return { written: count };
}

// ----------------- external fetchers -----------------
async function fetchDummyjsonPage({ page = 0, limit = 24 }) {
  const skip = Math.max(0, Number(page)) * Number(limit);
  const url = `https://dummyjson.com/products?limit=${limit}&skip=${skip}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`DummyJSON fetch failed: ${resp.status}`);
  const json = await resp.json();
  return Array.isArray(json.products) ? json.products : [];
}

// ----------------- routes -----------------
app.post('/api/import', requireAdmin, async (req, res) => {
  const { source = 'platzi', page = 0, limit = 24, categories } = req.body || {};
  try {
    let raw = [];
    if (source === 'dummyjson') {
      const cats = Array.isArray(categories) && categories.length ? categories : DJ_ALLOWED;
      raw = [];
      for (const cat of cats) {
        const chunk = await fetchDummyjsonCategory(cat, { page, limit });
        raw.push(...chunk);
      }
      const searchTerms = ["pants", "trousers", "jeans", "joggers", "leggings", "skirt", "maxi", "abaya"];
      for (const term of searchTerms) {
        const chunk = await fetchDummyjsonSearch(term, { limit: 32 });
        raw.push(...chunk);
      }
      raw = raw.filter(keepWomenOnly);
    } else {
      // NEW: fetch Platzi strictly from fashion categories and filter demo rows
      raw = await fetchPlatziFashion({ page, limit });
    }

    const mapped = raw
      .map(p => (source === 'dummyjson' ? mapDummyjson(p) : mapPlatzi(p)))
      .filter(m => typeof m.title === "string" && m.title.trim().length >= 3)
      .filter(m => Number.isFinite(m.price) && m.price > 0)
      .filter(m => Array.isArray(m.images) && m.images.length > 0);

    const result = await writeClothesBatch(mapped);
    res.json({
      ok: true,
      source,
      page: Number(page),
      limit: Number(limit),
      imported: result.written,
    });
  } catch (err) {
    console.error('import error:', err);
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

// Healthcheck
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "modestify-api",
  });
});

// PayPal routes (unchanged)
app.post("/api/paypal/create-order", async (req, res) => {
  try {
    const { purchase_units } = req.body || {};
    if (!Array.isArray(purchase_units) || purchase_units.length === 0) {
      return res.status(400).json({ error: "purchase_units missing" });
    }
    const access = await getPayPalAccessToken();
    const ppResp = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `req_${Date.now()}`,
      },
      body: JSON.stringify({
        intent: ORDER_INTENT,
        purchase_units,
        application_context: { shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW" },
      }),
    });
    const data = await ppResp.json().catch(() => ({}));
    if (!ppResp.ok || !data?.id) {
      return res.status(ppResp.status || 500).json({ error: data?.message || "create order failed", raw: data });
    }
    res.json({ id: data.id });
  } catch (err) {
    console.error("create-order error:", err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.post("/api/paypal/capture-order", async (req, res) => {
  try {
    const { orderID, userId = null, items = [] } = req.body || {};
    if (!orderID) return res.status(400).json({ error: "orderID missing" });
    const access = await getPayPalAccessToken();
    const capResp = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
    });
    const data = await capResp.json().catch(() => ({}));
    if (!capResp.ok) {
      return res.status(capResp.status || 500).json({ error: data?.message || "capture failed", raw: data });
    }
    const pu = Array.isArray(data?.purchase_units) ? data.purchase_units[0] : null;
    const amount = pu?.payments?.captures?.[0]?.amount || pu?.amount || null;
    const orderDoc = {
      id: orderID,
      userId: userId || null,
      status: data?.status || "COMPLETED",
      amount,
      purchase_units: data?.purchase_units || [],
      items,
      provider: "paypal",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      raw: { id: data?.id, status: data?.status },
    };
    await db.collection("orders").doc(orderID).set(orderDoc, { merge: true });
    res.json({ ok: true, id: orderID, status: orderDoc.status });
  } catch (err) {
    console.error("capture-order error:", err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// ----------------- start -----------------
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(
    `Modestify API is listening on port ${PORT}`
  );
});
