//ProductCard.js
import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";

export default function ProductCard({ product }) {
    const title =
    product.title ||
    product.name ||
    product.productName ||
    "ללא שם";
  const price = product.price != null ? Number(product.price).toFixed(2) : null;

  const images = useMemo(() => {
    // 1) images: array of strings OR array of objects with { url }
    if (Array.isArray(product.images) && product.images.length) {
      const flat = product.images
        .flatMap((v) => {
          if (typeof v === "string") return [v];
          if (v && typeof v === "object" && typeof v.url === "string") return [v.url];
          return [];
        })
        .filter(Boolean);
      const httpOnly = flat.filter((u) => /^https?:\/\//.test(u));
      if (httpOnly.length) return httpOnly;
      if (flat.length) return flat; // in case you ever store relative URLs
    }
    // 2) single URL fields
    if (typeof product.imageUrl === "string" && product.imageUrl) return [product.imageUrl];
    if (typeof product.thumbnail === "string" && product.thumbnail) return [product.thumbnail];
    return [];
  }, [product]);

  const [idx, setIdx] = useState(0);
  const active = images[idx] || null;

  function prev(e) {
    e.preventDefault();
    if (!images.length) return;
    setIdx((i) => (i - 1 + images.length) % images.length);
  }
  function next(e) {
    e.preventDefault();
    if (!images.length) return;
    setIdx((i) => (i + 1) % images.length);
  }

  return (
    <div className="product-card">
      <Link to={`/product/${product.id}`} style={{ textDecoration: "none", color: "inherit", position: "relative", display: "block" }}>
        {active ? (
          <img src={active} alt={title} />
        ) : (
          <div className="product-fallback" />
        )}

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="pcar-btn pcar-left"
              aria-label="previous"
            >
              ‹
            </button>
            <button
              onClick={next}
              className="pcar-btn pcar-right"
              aria-label="next"
            >
              ›
            </button>
            <div className="pcar-dots">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={i === idx ? "pcar-dot pcar-dot-active" : "pcar-dot"}
                />
              ))}
            </div>
          </>
        )}

        <div className="title">{title}</div>
        {price && <div className="price">{price} ₪</div>}
      </Link>
    </div>
  );
}
