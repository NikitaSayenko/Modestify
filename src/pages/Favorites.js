import React, { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";

function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      const storedFavorites = JSON.parse(localStorage.getItem("favorites")) || [];
      setFavorites(storedFavorites);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) return <h1>🔄 טוען מועדפים...</h1>;

  return (
    <div>
      <h1>המועדפים שלי</h1>
      {favorites.length === 0 ? (
        <p>❌ אין מוצרים במועדפים</p>
      ) : (
        <ul>
          {favorites.map(product => (
            <li key={product.id}>
              <img src={product.imageUrl} alt={product.name} width="100" />
              <p>{product.name} - {product.price}₪</p>
              <button 
                onClick={() => {
                  const updatedFavorites = favorites.filter(fav => fav.id !== product.id);
                  localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
                  setFavorites(updatedFavorites);
                }} 
                style={{ backgroundColor: "red", color: "white" }}
              >
                ❌ הסר מהמועדפים
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Favorites;
