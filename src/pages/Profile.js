import React, { useEffect, useState } from "react";
import { auth } from "../firebaseConfig";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true); // התחלת טעינה
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // סיום טעינה
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (loading) return <h1>🔄 טוען נתוני משתמש...</h1>;

  return (
    <div>
      <h1>האזור האישי</h1>
      {user ? (
        <div>
          <p>שלום, {user.displayName || user.email}</p>
          <p>אימייל: {user.email}</p>
          <button onClick={handleLogout} style={{ backgroundColor: "red", color: "white" }}>
            🔴 התנתק
          </button>
        </div>
      ) : (
        <p>⚠️ עליך להתחבר כדי לגשת לאזור האישי.</p>
      )}
    </div>
  );
}

export default Profile;
