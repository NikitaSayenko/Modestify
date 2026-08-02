// src/pages/SearchPage.js
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import SearchBar from "../components/SearchBar";
import Filters from "../components/Filters";
import ProductCard from "../components/ProductCard";

const norm = (s) => (s ?? "").toString().toLowerCase().trim();

function searchableText(p) {
  const fields = [
    p.name, p.title, p.productName, p.model, p.category,
    p.description, p.brand, Array.isArray(p.tags) ? p.tags.join(" ") : ""
  ];
  return fields.map(norm).join(" ");
}

export default function SearchPage() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);

  const [q, setQ] = useState(params.get("q") || "");
  const [cat, setCat] = useState(params.get("category") || "");
  const [min, setMin] = useState(params.get("min") || "");
  const [max, setMax] = useState(params.get("max") || "");
  const [sort, setSort] = useState(params.get("sort") || "");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // sync from URL
  useEffect(() => {
    const p = new URLSearchParams(search);
    setQ(p.get("q") || "");
    setCat(p.get("category") || "");
    setMin(p.get("min") || "");
    setMax(p.get("max") || "");
    setSort(p.get("sort") || "");
  }, [search]);

  // fetch approved products once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const qClothes = query(collection(db, "clothes"), where("approved", "==", true));
        const snap = await getDocs(qClothes);
        if (cancelled) return;
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        if (!cancelled) setErr(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => {
    const s = new Set();
    for (const p of items) if (p.category) s.add(String(p.category));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const results = useMemo(() => {
    const needle = norm(q);
    const minN = min === "" ? null : Number(min);
    const maxN = max === "" ? null : Number(max);

    let out = items.filter((p) => {
      if (needle && !searchableText(p).includes(needle)) return false;
      if (cat && String(p.category) !== cat) return false;

      const price = Number(p.price);
      if (Number.isFinite(price)) {
        if (minN != null && price < minN) return false;
        if (maxN != null && price > maxN) return false;
      } else if (minN != null || maxN != null) {
        return false;
      }
      return true;
    });

    if (sort === "price_asc") {
      out = out.slice().sort((a, b) => Number(a.price ?? Infinity) - Number(b.price ?? Infinity));
    } else if (sort === "price_desc") {
      out = out.slice().sort((a, b) => Number(b.price ?? -Infinity) - Number(a.price ?? -Infinity));
    }
    return out;
  }, [items, q, cat, min, max, sort]);

  function updateParam(name, value) {
    const p = new URLSearchParams(search);
    if (value) p.set(name, value); else p.delete(name);
    navigate(`/search?${p.toString()}`, { replace: true });
  }

  function handleSearch(term) {
    const t = term.trim();
    setQ(t);
    updateParam("q", t);
  }

  if (loading) return <div className="container" style={{marginTop:24}}>טוען…</div>;
  if (err)     return <div className="container" style={{marginTop:24, color:"crimson"}}>שגיאה: {err}</div>;

  return (
    <div className="container" dir="rtl">
      <h1 className="page-title">חיפוש</h1>

      <div style={{ margin: "12px 0 16px" }}>
        <SearchBar onSearch={handleSearch} placeholder="חיפוש פריטים (שם, קטגוריה, תיאור…)" />
      </div>

      <Filters
        categories={categories}
        cat={cat}
        min={min}
        max={max}
        sort={sort}
        onCat={(v) => { setCat(v); updateParam("category", v); }}
        onMin={(v) => { setMin(v); updateParam("min", v); }}
        onMax={(v) => { setMax(v); updateParam("max", v); }}
        onSort={(v) => { setSort(v); updateParam("sort", v); }}
      />

      <p style={{ marginTop: 4 }}>
        {q ? <>מציג תוצאות עבור: <strong>{q}</strong>. </> : null}
        נמצאו <strong>{results.length}</strong> פריטים.
      </p>

      {results.length === 0 ? (
        <p>לא נמצאו תוצאות.</p>
      ) : (
        <div className="product-grid">
          {results.map((p) => (
            <div key={p.id}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
