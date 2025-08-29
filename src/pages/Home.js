import React, { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await getDocs(collection(db, "clothes"));
      const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
    };

    fetchData();
  }, []);

  return (
    <div>
      <h1>ברוכים הבאים ל-Modestify</h1>
      <h2>מוצרים פופולריים</h2>
      <ul>
  {products.map(product => (
    <li key={product.id}>
      <Link to={`/product/${product.id}`}>
        <img src={product.imageUrl} alt={product.name} width="100" />
        <p>{product.name} - {product.price}₪</p>
      </Link>
    </li>
  ))}
</ul>
    </div>
  );
}

export default Home;
