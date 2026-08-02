//Categories.js
import React from "react";
import { Link } from "react-router-dom";

const cats = [
  { key: "headcover",   name: "כיסויי ראש",        img: "/images/categories/headcover.png" },
  { key: "dress",       name: "שמלות",             img: "/images/categories/dress.png" },
  { key: "skirt",       name: "חצאיות",            img: "/images/categories/skirt.png" },
  { key: "shirt",       name: "חולצות",            img: "/images/categories/shirt.png" },
  { key: "pants",       name: "מכנסיים",          img: "/images/categories/pants.png" },
  { key: "accessories", name: "אביזרים",          img: "/images/categories/accessories.png" },
  { key: "outerwear",   name: "ג׳קטים",           img: "/images/categories/outerwear.png" },
  { key: "shoes",       name: "נעליים",            img: "/images/categories/shoes.png" },
];

export default function Categories() {
  return (
    <div className="container">
      <h1 className="page-title">קטגוריות</h1>

      <section className="hero-categories">
        <div className="hero-grid">
          {cats.map((c) => (
            <Link key={c.key} to={`/categories/${c.key}`} className="hero-card-lg">
              <div className="hero-media">
                <img src={c.img} alt={c.name} className="hero-img-lg" />
              </div>
              <div className="hero-name">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
