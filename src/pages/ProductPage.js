import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { Button, Modal } from "react-bootstrap";
import { useCart } from "../context/CartContext";

function ProductPage() {
const { id } = useParams();
const [product, setProduct] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [showModal, setShowModal] = useState(false);
const [modalMessage, setModalMessage] = useState("");
const { addToCart } = useCart();

useEffect(() => {
  const fetchProduct = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, "clothes", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() });
      } else {
        setError("⚠️ המוצר לא נמצא");
      }
    } catch (err) {
      setError("❌ שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  };

  fetchProduct();
}, [id]);

const addToFavorites = () => {
  const storedFavorites = JSON.parse(localStorage.getItem("favorites")) || [];
  if (!storedFavorites.some(fav => fav.id === product.id)) {
    storedFavorites.push(product);
    localStorage.setItem("favorites", JSON.stringify(storedFavorites));
    setModalMessage("✅ המוצר נוסף למועדפים!");
  } else {
    setModalMessage("⚠️ המוצר כבר במועדפים.");
  }
  setShowModal(true);
};

if (loading) return <h1>🔄 טוען מוצר...</h1>;
if (error) return <h1>{error}</h1>;

return (
  <div>
    <h1>{product.name}</h1>
    <img src={product.imageUrl} alt={product.name} width="200" />
    <p>מחיר: {product.price}₪</p>
    <p>{product.description}</p>
          <div style={{ marginTop: 16 }}>
      <Button onClick={addToFavorites} variant="success" className="me-2">
        💖 הוסף למועדפים
      </Button>
      <Button
        onClick={() =>
  addToCart({
    id:                   product.id,
    name:                 product.name,
    price:                product.price,
    imageUrl:             product.imageUrl,
    merchantPayPalEmail:  product.merchantPayPalEmail
  })
        }
        variant="primary"
      >
        ➕ הוסף לעגלה
      </Button>
    </div>
    

    {/* חלון מודאלי להצגת הודעות */}
    <Modal show={showModal} onHide={() => setShowModal(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>📢 הודעה</Modal.Title>
      </Modal.Header>
      <Modal.Body>{modalMessage}</Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={() => setShowModal(false)}>
          סגור
        </Button>
      </Modal.Footer>
    </Modal>
  </div>
);
}

export default ProductPage;
