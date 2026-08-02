// src/pages/CategoryPage.js
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { db } from "../firebaseConfig";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import Filters from "../components/Filters";
import ProductCard from "../components/ProductCard";

// i18n map
const CATEGORY_I18N = {
  skirt: "חצאיות",
  dress: "שמלות",
  shirt: "חולצות",
  pants: "מכנסיים",
  headcover: "כיסויי ראש",
  accessories: "אביזרים",
  shoes: "נעליים",
  outerwear: "ג'קטים",
};

const norm = (s) => (s ?? "").toString().toLowerCase().trim();

const normalizeCatValue = (c) => {
  if (c == null) return "";
  if (typeof c === "string") return c.trim().toLowerCase();
  if (typeof c === "object") return String(c.id || c.name || c.label || "").trim().toLowerCase();
  return "";
};
function catKey(raw) {
  const s = norm(normalizeCatValue(raw) || String(raw || ""));
  const map = {
    // dress
    "שמלה":"dress","שמלות":"dress","dress":"dress","womens-dresses":"dress",
    // skirt
    "חצאית":"skirt","חצאיות":"skirt","skirt":"skirt","womens-skirts":"skirt",
    // shirts / tops
    "חולצה":"shirt","חולצות":"shirt","shirt":"shirt","top":"shirt","tops":"shirt",
    "blouse":"shirt","t-shirt":"shirt","tee":"shirt",
    // pants / trousers
    "מכנסיים":"pants","מכנס":"pants","pants":"pants","pant":"pants",
    "trousers":"pants","jeans":"pants","denim":"pants","leggings":"pants",
    "slacks":"pants","cargo":"pants","jogger":"pants","joggers":"pants",
    "sweatpant":"pants","sweatpants":"pants",
    // headcover
    "כיסוי ראש":"headcover","כיסויי ראש":"headcover",
    "headcover":"headcover","headwear":"headcover",
    "hijab":"headcover","headscarf":"headcover","scarf":"headcover",
    "shawl":"headcover","veil":"headcover","turban":"headcover",
    "beret":"headcover","head wrap":"headcover","headwrap":"headcover",
    // shoes
    "נעליים":"shoes","נעל":"shoes","shoes":"shoes","shoe":"shoes",
    "sneaker":"shoes","sneakers":"shoes","boot":"shoes","boots":"shoes",
    "heel":"shoes","heels":"shoes","sandal":"shoes","sandals":"shoes",
    "loafer":"shoes","loafers":"shoes","flat":"shoes","flats":"shoes",
    // outerwear
    "outerwear":"outerwear","ג׳קטים":"outerwear","ג'קטים":"outerwear","ג׳קט":"outerwear",
    "מעיל":"outerwear","מעילים":"outerwear","jacket":"outerwear","jackets":"outerwear",
    "coat":"outerwear","coats":"outerwear","cardigan":"outerwear","cardigans":"outerwear",
    "sweater":"outerwear","sweaters":"outerwear","hoodie":"outerwear","hoodies":"outerwear",
    "sweatshirt":"outerwear","sweatshirts":"outerwear",
    // accessories (bags, watches, etc.)
    "accessories":"accessories","bag":"accessories","bags":"accessories",
    "purse":"accessories","wallet":"accessories","watch":"accessories",
    "belt":"accessories","tote":"accessories","backpack":"accessories"
  };
  return map[s] || s;
}



export default function CategoryPage() {
  const { category: rawCategory = "" } = useParams();
  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);

  // URL-driven filters
  const [min, setMin]   = useState(params.get("min") || "");
  const [max, setMax]   = useState(params.get("max") || "");
  const [sort, setSort] = useState(params.get("sort") || "");

  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState(null);

  // keep state synced if URL changes
  useEffect(() => {
    const p = new URLSearchParams(search);
    setMin(p.get("min") || "");
    setMax(p.get("max") || "");
    setSort(p.get("sort") || "");
  }, [search]);

// Load items for this category (approved only), union exact + aliases,
// and allow items where `available` is missing (treat as available).
useEffect(() => {
  let cancelled = false;

  async function load() {
    setLoading(true);
    setErr(null);
    setItems([]);

    const target = catKey(rawCategory);

    try {
      // Exact match: approved + exact category (no available filter)
      const snapExact = await getDocs(query(
      collection(db, "clothes"),
      where("approved", "==", true),
      where("available", "==", true),
      where("category", "==", rawCategory),
      limit(300)
    ));

      const exact = snapExact.docs.map(d => ({ id: d.id, ...d.data() }));

      // Aliases: approved only, filter client-side by catKey
      const snapAll = await getDocs(query(
      collection(db, "clothes"),
      where("approved", "==", true),
      where("available", "==", true),
      limit(800)
    ));

      const all = snapAll.docs.map(d => ({ id: d.id, ...d.data() }));
      const aliasMatches = all.filter(x => catKey(x.category) === target);

      // Merge + dedupe + allow undefined available
      const merged = [...exact, ...aliasMatches]
        .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)


      if (!cancelled) setItems(merged);
    } catch (e) {
      if (!cancelled) setErr(e?.message || String(e));
    } finally {
      if (!cancelled) setLoading(false);
    }
  }

  load();
  return () => { cancelled = true; };
}, [rawCategory]);

  // Apply price/sort filters client-side
  const results = useMemo(() => {
    const minN = min === "" ? null : Number(min);
    const maxN = max === "" ? null : Number(max);

    let out = items.filter((p) => {
      const price = Number(p.price);
      if (Number.isFinite(price)) {
        if (minN != null && price < minN) return false;
        if (maxN != null && price > maxN) return false;
      } else {
        if (minN != null || maxN != null) return false;
      }
      return true;
    });

    if (sort === "price_asc") {
      out = out.slice().sort((a, b) => Number(a.price ?? Infinity) - Number(b.price ?? Infinity));
    } else if (sort === "price_desc") {
      out = out.slice().sort((a, b) => Number(b.price ?? -Infinity) - Number(a.price ?? -Infinity));
    }

    return out;
  }, [items, min, max, sort]);

  function updateParam(name, value) {
    const p = new URLSearchParams(search);
    if (value) p.set(name, value); else p.delete(name);
    navigate(`/categories/${encodeURIComponent(rawCategory)}?${p.toString()}`, { replace: true });
  }

  if (loading) return <div style={{ maxWidth: 1000, margin: "24px auto" }}>Loading…</div>;
  if (err)     return <div style={{ maxWidth: 1000, margin: "24px auto", color: "crimson" }}>Error: {err}</div>;

  return (
    <div className="container">
      <h1 className="page-title">{CATEGORY_I18N[rawCategory] ?? rawCategory}</h1>

      <Filters
        hideCategory
        categories={[]}
        cat={""}
        min={min}
        max={max}
        sort={sort}
        onCat={() => {}}
        onMin={(v) => { setMin(v); updateParam("min", v); }}
        onMax={(v) => { setMax(v); updateParam("max", v); }}
        onSort={(v) => { setSort(v); updateParam("sort", v); }}
      />

      <p style={{ marginTop: 8 }}>
        נמצאו <strong>{results.length}</strong> פריטים בקטגוריה זו.
      </p>

      {results.length === 0 ? (
        <p>אין פריטים להצגה.</p>
      ) : (
        <div className="product-grid">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
