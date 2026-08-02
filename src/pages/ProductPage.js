// src/pages/ProductPage.js
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebaseConfig";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  limit as qLimit,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import ProductCard from "../components/ProductCard";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";


function textify(v) {
  if (v == null) return "";
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(textify).join(", ");
  if (t === "object") {
    const prefs = ["name", "title", "label", "value", "id"];
    for (const k of prefs) if (v[k] != null) return textify(v[k]);
    try { return JSON.stringify(v); } catch { return ""; }
  }
  return String(v);
}

function pickImages(p) {
  if (Array.isArray(p?.images)) {
    return p.images.filter((u) => typeof u === "string" && u.startsWith("http"));
  }
  if (typeof p?.imageUrl === "string") return [p.imageUrl];
  if (typeof p?.thumbnail === "string") return [p.thumbnail];
  return [];
}
// helpers at file scope (stable, no hook deps)
function norm(s) {
  return (s ?? "").toString().toLowerCase().trim();
}

function catKey(raw) {
  const s = norm(textify(raw));
  const map = {
    "שמלה": "dress", "שמלות": "dress", "dress": "dress",
    "חולצה": "shirt", "חולצות": "shirt", "tops": "shirt", "shirt": "shirt",
    "חצאית": "skirt", "חצאיות": "skirt", "skirt": "skirt",
    "מכנסיים": "pants", "pants": "pants", "trousers": "pants",
    "אביזרים": "accessories", "accessories": "accessories",
    "תיק": "bag", "תיקים": "bag", "bag": "bag",
    "נעליים": "shoes", "shoes": "shoes",
    "ג׳קטים": "outerwear", "מעילים": "outerwear", "outerwear": "outerwear",
    "כיסויי ראש": "headcover", "כיסוי ראש": "headcover", "headcover": "headcover",
    "שעון": "watch", "שעונים": "watch", "watch": "watch"
  };
  return map[s] || s;
}

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { firebaseUser } = useAuth();
  const { addToCart } = useCart();

  const [prod, setProd] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const images = useMemo(() => pickImages(prod), [prod]);
  const [idx, setIdx] = useState(0);
  const active = images[idx] || null;

  const [isFav, setIsFav] = useState(false);
  const favRef = firebaseUser && prod ? doc(db, "users", firebaseUser.uid, "favorites", prod.id) : null;


  // Subscribe to the product document.
  // If user lacks permission (not approved/available), handle gracefully.
  useEffect(() => {
    setErr(null);
    setLoading(true);
    const ref = doc(db, "clothes", id);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        if (!data) {
          setProd(null);
          setLoading(false);
          setErr("Product not found.");
          return;
        }
        setProd({ id: snap.id, ...data });
        setIdx(0);
        setLoading(false);
      },
      (e) => {
        // Handle permission errors explicitly to avoid noisy console logs.
        if (e?.code === "permission-denied") {
          setProd(null);
          setErr("This product is not available for viewing.");
          setLoading(false);
          return;
        }
        setErr(e?.message || String(e));
        setLoading(false);
      }
    );

    return () => unsub();
  }, [id]);

  // Favorite live status
  useEffect(() => {
    if (!favRef) { setIsFav(false); return; }
    const unsub = onSnapshot(favRef, (d) => setIsFav(d.exists()));
    return () => unsub();
  }, [favRef]);

// Load related items – client-side ranking with safe fallbacks
useEffect(() => {
  let cancelled = false;

  (async () => {
    if (!prod) { setRelated([]); return; }

    try {

      const snap = await getDocs(query(
      collection(db, "clothes"),
      where("approved", "==", true),
      where("available", "==", true),
      qLimit(200)
    ));



      const pool = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(r => r.id !== id)
        .filter(r => r.available !== false);


      const baseKey   = catKey(prod.category);
      const baseBrand = norm(textify(prod.brand) || textify(Array.isArray(prod.tags) ? prod.tags[0] : ""));
      const baseTags  = new Set((Array.isArray(prod.tags) ? prod.tags : []).map(t => norm(t)));
      const basePrice = Number(prod.price || 0);


      function score(r) {
        let s = 0;

        if (baseKey && catKey(r.category) === baseKey) s += 100;

        const rBrand = norm(textify(r.brand) || textify(Array.isArray(r.tags) ? r.tags[0] : ""));
        if (rBrand && baseBrand && rBrand === baseBrand) s += 40;

        const rTags = new Set((Array.isArray(r.tags) ? r.tags : []).map(t => norm(t)));
        let overlap = 0; baseTags.forEach(t => { if (rTags.has(t)) overlap++; });
        s += overlap * 10;

        const rp = Number(r.price || 0);
        if (basePrice && rp) {
          const diff = Math.abs(basePrice - rp);
          if (diff < basePrice * 0.10) s += 20;
          else if (diff < basePrice * 0.25) s += 10;
        }


        const ca = r.createdAt && (r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt));
        if (ca && !isNaN(ca)) {
          const ageDays = (Date.now() - ca.getTime()) / 86400000;
          if (ageDays < 7) s += 6; else if (ageDays < 30) s += 3;
        }

        return s;
      }

      const ranked = pool
        .map(r => [score(r), r])
        .sort((a, b) => b[0] - a[0])
        .map(([, r]) => r);

      if (!cancelled) setRelated(ranked.slice(0, 10));
    } catch (e) {
      console.warn("Related failed:", e?.message || e);
      if (!cancelled) setRelated([]);
    }
  })();

  return () => { cancelled = true; };
}, [prod, id]);




  function prevImg(e) {
    e.preventDefault();
    if (!images.length) return;
    setIdx((i) => (i - 1 + images.length) % images.length);
  }

  function nextImg(e) {
    e.preventDefault();
    if (!images.length) return;
    setIdx((i) => (i + 1) % images.length);
  }

  function handleAddToCart() {
    if (!prod) return;

    const title = textify(prod.title) || textify(prod.name) || "";
    const price = Number(prod.price || 0);
    const image = images[0] || active || "";
    const categoryText = textify(prod.category) || "";
    const sellerText =
      textify(prod?.seller) || textify(prod?.store) || textify(prod?.vendor) || "";

    // Cart item must be primitives only
    const item = {
      id: prod.id,
      title,
      price,
      image,
      category: categoryText,
      seller: sellerText,
    };

    try {
      addToCart(item);
    } catch {
      // Fallback event in case a custom cart listener exists
      window.dispatchEvent(new CustomEvent("cart:add", { detail: item }));
    }
  }

  async function toggleFavorite() {
    if (!firebaseUser) { navigate("/login"); return; }
    if (!favRef || !prod) return;

    if (isFav) {
      await deleteDoc(favRef);
    } else {
      const minimal = {
        productId: prod.id,
        title: textify(prod.title) || textify(prod.name) || "",
        price: Number(prod.price || 0),
        image: images[0] || "",
        category: textify(prod.category) || "",
        sourceApi: textify(prod.sourceApi) || "",
        createdAt: Date.now(),
      };
      await setDoc(favRef, minimal, { merge: true });
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ direction: "rtl" }}>
        <div className="panel" style={{ padding: 24 }}>טוען…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="container" style={{ direction: "rtl" }}>
        <div className="panel" style={{ padding: 24, color: "crimson" }}>{err}</div>
      </div>
    );
  }

  if (!prod) {
    return (
      <div className="container" style={{ direction: "rtl" }}>
        <div className="panel" style={{ padding: 24 }}>לא נמצא מוצר להצגה.</div>
      </div>
    );
  }

  const title = textify(prod.title) || textify(prod.name) || "—";
  const displayPrice = prod.price != null ? Number(prod.price).toFixed(2) : null;
  const tags = Array.isArray(prod.tags) ? prod.tags : [];
  const brand = textify(tags[0]) || "";
  const color = textify(tags[1]) || "";
  const style = textify(tags[2]) || "";
  const category = textify(prod.category) || "";
  const desc = textify(prod.description) || "";

  const productUrl = prod?.productUrl || prod?.url || prod?.externalUrl || "";
  const seller =
    textify(prod?.seller) || textify(prod?.store) || textify(prod?.vendor) || brand || "";
  const sourceApi = textify(prod?.sourceApi) || "";
  const sourceId = textify(prod?.sourceId) || "";



  return (
    <div className="container" style={{ direction: "rtl" }}>
      <div className="pdp-header">
        <h1 className="pdp-title">{title}</h1>
      </div>

      <div className="pdp-grid">
        <div className="panel pdp-media">
          <div className="pdp-inner">
            {active ? (
              <img src={active} alt={title} className="pdp-img" />
            ) : (
              <div style={{ width: "100%", height: 360, background: "var(--sand)", borderRadius: "14px" }} />
            )}
            {images.length > 1 && (
              <>
                <button className="pdp-arrow pdp-left" onClick={prevImg} aria-label="previous" />
                <button className="pdp-arrow pdp-right" onClick={nextImg} aria-label="next" />
                <div className="pdp-dots">
                  {images.map((_, i) => (
                    <span key={i} className={i === idx ? "pdp-dot active" : "pdp-dot"} />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="pdp-thumbs">
            {images.map((u, i) => (
              <img
                key={i}
                src={u}
                alt={"thumb"+i}
                className={i === idx ? "pdp-thumb selected" : "pdp-thumb"}
                onClick={() => setIdx(i)}
              />
            ))}
          </div>
        </div>

        <div className="panel pdp-info">
          <div className="pdp-price-row">
            {displayPrice && <div className="pdp-price">₪{displayPrice}</div>}
            {category && <span className="pill">{category}</span>}
          </div>

          {/* description first */}
          <div className="pdp-desc">{desc || "אין תיאור למוצר."}</div>

          <ul className="pdp-specs">
            {brand && <li><span>מותג</span><strong>{brand}</strong></li>}
            {color && <li><span>צבע</span><strong>{color}</strong></li>}
            {style && <li><span>סגנון</span><strong>{style}</strong></li>}
            {prod?.available === false && <li><span>זמינות</span><strong>לא זמין</strong></li>}
          </ul>

          <div className="pdp-source">
            <div className="src-row"><span>מוכר</span><strong>{seller || "—"}</strong></div>
            <div className="src-row"><span>מקור</span><strong>{sourceApi || "—"}</strong></div>
            {sourceId && <div className="src-note">ID: {sourceId}</div>}
            {productUrl ? (
              <a className="btn-outline" href={productUrl} target="_blank" rel="noopener noreferrer">
                צפה באתר המקור
              </a>
            ) : (
              <div className="src-note">אין קישור לאתר המקור</div>
            )}
          </div>

<div className="pdp-actions">
  <button className="button" onClick={handleAddToCart}>הוסף לעגלה</button>
  <button className="btn-danger" onClick={toggleFavorite}>
    {isFav ? "הסר מהמועדפים" : "הוסף למועדפים"}
  </button>
</div>


        </div>
      </div>

      {/* related stays full width */}
      <div className="panel">
        <h3 className="pdp-subtitle">מוצרים דומים</h3>
        <div className="pdp-related">
          {related.map((p) => (
            <div key={p.id} className="pdp-related-card">
              <ProductCard product={p} />
            </div>
          ))}
          {related.length === 0 && <div className="muted">לא נמצאו מוצרים דומים.</div>}
        </div>
      </div>
    </div>
  );
}
