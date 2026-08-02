import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { db } from "../firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import ProductCard from "../components/ProductCard";

function useQueryString() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}
const norm = (s) => (s ?? "").toString().toLowerCase().trim();

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");




  const params = useQueryString();
  const qParam = params.get("q") || "";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const q = query(
  collection(db, "clothes"),
  where("approved", "==", true),
  where("available", "==", true)
);
const snap = await getDocs(q);
        if (cancelled) return;
        setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        if (!cancelled) setError(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = norm(qParam);
    if (!q) return products;
    return products.filter((p) => {
      const haystacks = [
        p.name,
        p.category,
        p.description,
        p.brand,
        Array.isArray(p.tags) ? p.tags.join(" ") : ""
      ];
      return haystacks.some((h) => norm(h).includes(q));
    });
  }, [products, qParam]);



function Pagination({ page, pageCount, total, showingStart, showingEnd, onPrev, onNext }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
        <button className="button" disabled={page === 0} onClick={onPrev}>הקודם</button>
        <span style={{ minWidth: 140, textAlign: "center" }}>
          עמוד {page + 1} מתוך {pageCount}
        </span>
        <button className="button" disabled={page + 1 >= pageCount} onClick={onNext}>הבא</button>
      </div>

      <small style={{ color: "var(--muted)", textAlign: "center" }}>
        מציג {total === 0 ? 0 : showingStart}-{showingEnd} מתוך {total}
      </small>
    </div>
  );
}



  // Pagination state
const PAGE_SIZE = 20;
const [page, setPage] = useState(0);

// Reset page when the search query changes
useEffect(() => {
  setPage(0);
}, [qParam]);

// Derived client-side paging over filtered results
const pageCount = useMemo(
  () => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
  [filtered.length]
);
const paged = useMemo(() => {
  const start = page * PAGE_SIZE;
  return filtered.slice(start, start + PAGE_SIZE);
}, [filtered, page]);

  const heroCats = [
  { key: "headcover",   name: "כיסויי ראש",        img: "/images/categories/headcover.png" },
  { key: "dress",       name: "שמלות",             img: "/images/categories/dress.png" },
  { key: "skirt",       name: "חצאיות",            img: "/images/categories/skirt.png" },
  { key: "shirt",       name: "חולצות",            img: "/images/categories/shirt.png" },
  { key: "pants",       name: "מכנסיים",          img: "/images/categories/pants.png" },
  { key: "accessories", name: "אביזרים",          img: "/images/categories/accessories.png" },
  { key: "outerwear",   name: "ג׳קטים",  img: "/images/categories/outerwear.png" },
  { key: "shoes",       name: "נעליים",            img: "/images/categories/shoes.png" },
  ];

  if (loading) return <div style={{ maxWidth: 900, margin: "24px auto" }}>Loading…</div>;
  if (error)   return <div style={{ maxWidth: 900, margin: "24px auto", color: "crimson" }}>Error: {error}</div>;

  return (
    <div className="container">
      <h1 className="page-title">ברוכים הבאים</h1>

      {qParam ? (
        <p style={{ marginTop: 8 }}>
          מציג תוצאות עבור: <strong>{qParam}</strong> ({filtered.length})
        </p>
      ) : null}

      {/* Highlights */}
      <section className="hero-categories">
        <div className="hero-grid">
          {heroCats.map(c => (
            <Link key={c.key} to={`/categories/${c.key}`} className="hero-card-lg">
              <div className="hero-media">
                <img src={c.img} alt={c.name} className="hero-img-lg" />
              </div>
              <div className="hero-name">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Products */}
      {filtered.length === 0 ? (
        <p>אין פריטים להצגה.</p>
      ) : (
<section className="home-products">
  <div className="product-grid">
    {paged.map((p) => (
      <ProductCard key={p.id} product={p} />
    ))}
  </div>

{/* Pager */}
<Pagination
  page={page}
  pageCount={pageCount}
  total={filtered.length}
  showingStart={filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}
  showingEnd={Math.min(filtered.length, (page + 1) * PAGE_SIZE)}
  onPrev={() => setPage((p) => Math.max(0, p - 1))}
  onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
/>


</section>

      )}
    </div>
  );
}
