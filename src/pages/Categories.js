import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

function Categories() {
  const categories = ["שמלות", "חצאיות", "חולצות", "כיסויי ראש"];

  return (
    <div>
      <h1>קטגוריות</h1>
      <ul>
        {categories.map(category => (
          <li key={category}>
            <Link to={`/categories/${category}`}>{category}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Categories;
