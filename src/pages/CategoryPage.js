import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

function CategoryPage() {
const { category } = useParams();
const [products, setProducts] = useState([]);
const { addToCart } = useCart();

useEffect(() => {
  const fetchData = async () => {
    const q = query(collection(db, "clothes"), where("category", "==", category));
    const querySnapshot = await getDocs(q);
    const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setProducts(items);
  };

  fetchData();
}, [category]);

return (
  <div>
    <h1>קטגוריה: {category}</h1>
    <ul>
  {products.map(product => (
  <li key={product.id} style={{ marginBottom: 16 }}>
    <Link to={`/product/${product.id}`}>
      <img src={product.imageUrl} alt={product.name} width="100" />
      <p>{product.name} - {product.price}₪</p>
    </Link>
    <button
      onClick={() =>
        addToCart({
          id:                   product.id,
          name:                 product.name,
          price:                product.price,
          imageUrl:             product.imageUrl,
          merchantPayPalEmail: "sb-agof244931633@business.example.com"
        })
      }
    >
      ➕ הוסף לעגלה
    </button>
  </li>
))}
</ul>
  </div>
);
}

export default CategoryPage;
